import type ImageAssetSet from "./assets/ImageAssetSet";
import type Camera from "./Camera";
import {
	getViewTransform,
	type MapBounds,
	measureMapBounds,
	rcToWorldTopLeft,
	snapped,
	worldToScreen,
} from "./lib/viewport/viewport";
import type {
	Entity,
	GridSpriteMeta,
	ImageAsset,
	MapData,
	RectsSpriteMeta,
	SpriteMeta,
} from "./types";
import { delayUntil, imageHasLoaded } from "./utils";

class GameMap {
	background: HTMLCanvasElement;
	target: HTMLCanvasElement;
	cursorTarget: HTMLCanvasElement;
	camera: Camera;

	ground: MapData;
	entities: Entity[];

	rows: number;
	columns: number;

	selectedTile: [number, number] | null = null;
	imageAssetSet: ImageAssetSet;

	_bounds?: MapBounds;
	_metrics?: {
		W: number;
		H: number;
		Wmax: number;
		Hmax: number;
		rows: number;
		cols: number;
	};

	// -------- Night tint state --------
	// 0 = day, 1 = full night
	private nightProgress: number = 0;
	// Apply to which surface: view canvas (recommended) or prerendered background
	nightApplyTarget: "map" | "background" = "map";
	private nightAnim: {
		start: number;
		duration: number;
		from: number;
		to: number;
		onDone?: () => void;
	} | null = null;

	/* ---- Simple glow system ---- */
	private glows: Array<{
		row: number;
		col: number;
		offsetPx?: [number, number]; // world-pixel offset from the tile’s top-left
		radius: number; // radius in *screen* pixels at zoom=1; auto-scales with zoom
		alpha?: number; // 0..1
		linkToNight?: boolean; // if true, alpha scales with nightProgress
		onAbove?: number; // light is fully on when nightProgress >= onAbove (e.g. 0.6)
		offBelow?: number; // light is fully off when nightProgress <= offBelow (e.g. 0.3)
	}> = [];

	addGlow(g: {
		row: number;
		col: number;
		offsetPx?: [number, number];
		radius?: number;
		alpha?: number;
		linkToNight?: boolean;
		onAbove?: number;
		offBelow?: number;
	}) {
		const {
			row,
			col,
			offsetPx = [0, 0],
			radius = 16,
			alpha = 0.6,
			linkToNight = true,
			onAbove = 0.65,
			offBelow = 0.35,
		} = g;
		this.glows.push({
			row,
			col,
			offsetPx,
			radius,
			alpha,
			linkToNight,
			onAbove,
			offBelow,
		});
	}

	private smoothstep(edge0: number, edge1: number, x: number) {
		// Scale, clamp, then smooth cubic
		const t = Math.max(
			0,
			Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)),
		);
		return t * t * (3 - 2 * t);
	}

	clearGlows() {
		this.glows = [];
	}
	private drawGlow(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius = 16,
		alpha = 0.6,
	) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
		g.addColorStop(0, `rgba(255, 230, 140, ${alpha})`);
		g.addColorStop(1, "rgba(255, 230, 140, 0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	private drawGlows() {
		if (!this.glows.length || !this._metrics || !this._bounds) return;
		const ctx = this.target.getContext("2d");
		if (!ctx) return;
		// Compute view transform (for screen coordinates)
		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});
		const tfSnap = snapped(tf);
		// Draw glows in *screen* space so radii look consistent; scale with zoom.
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		for (const g of this.glows) {
			const {
				row,
				col,
				offsetPx = [0, 0],
				radius,
				alpha = 0.6,
				linkToNight = true,
				onAbove = 0.65,
				offBelow = 0.35,
			} = g;

			// compute effective alpha vs nightProgress
			let aEff = alpha;
			if (linkToNight) {
				// fades 0→1 between offBelow..onAbove with a smooth curve
				const k = this.smoothstep(offBelow, onAbove, this.nightProgress);
				aEff = alpha * k;
				if (aEff <= 0.01) continue; // effectively off
			}
			const { wx, wy } = rcToWorldTopLeft(
				row,
				col,
				this._metrics,
				this._bounds,
			);
			// Top-left of tile (world), convert to screen:
			const { x, y } = worldToScreen(
				wx + offsetPx[0],
				wy + offsetPx[1],
				tfSnap,
			);
			this.drawGlow(ctx, x, y, radius * tfSnap.zoom, aEff);
		}
		ctx.restore();
	}

	constructor({
		background,
		target,
		cursorTarget,
		camera,
		ground,
		entities,
		imageAssetSet,
	}: {
		background: HTMLCanvasElement;
		target: HTMLCanvasElement;
		cursorTarget: HTMLCanvasElement;
		camera: Camera;
		ground: MapData;
		entities: Entity[];
		imageAssetSet: ImageAssetSet;
	}) {
		this.background = background;
		this.target = target;
		this.cursorTarget = cursorTarget;
		this.camera = camera;
		this.ground = ground;
		this.entities = entities;
		this.imageAssetSet = imageAssetSet;

		this.draw = this.draw.bind(this);
		this.loadImageAssets = this.loadImageAssets.bind(this);
		this.hasLoaded = this.hasLoaded.bind(this);
		this.load = this.load.bind(this);
		this.getMapCoords = this.getMapCoords.bind(this);
		this.sampleBackground = this.sampleBackground.bind(this);
		this.clearCursor = this.clearCursor.bind(this);
		this.clearPreview = this.clearPreview.bind(this);
		this.drawPreview = this.drawPreview.bind(this);
		this.clearEntitiesInArea = this.clearEntitiesInArea.bind(this);
		this.fitsOnMap = this.fitsOnMap.bind(this);

		this.renderFrame = this.renderFrame.bind(this);
		this.drawAnimatedEntities = this.drawAnimatedEntities.bind(this);
		this.computeSpriteSourceRect = this.computeSpriteSourceRect.bind(this);
		this.frameIndexToRect = this.frameIndexToRect.bind(this);
		this.resizeCanvases = this.resizeCanvases.bind(this);
		this.animate = this.animate.bind(this);

		this.rows = this.ground.length;
		this.columns = Math.max(...this.ground.map((r) => r.length));
	}

	/* ---------- Night helpers ---------- */

	setNightProgress(v: number) {
		this.nightProgress = Math.max(0, Math.min(1, v));
	}

	fadeToNight(duration = 2500, onDone?: () => void) {
		this.nightAnim = {
			start: performance.now(),
			duration,
			from: this.nightProgress,
			to: 1,
			onDone,
		};
	}

	fadeToDay(duration = 2500, onDone?: () => void) {
		this.nightAnim = {
			start: performance.now(),
			duration,
			from: this.nightProgress,
			to: 0,
			onDone,
		};
	}

	private easeInOut(t: number) {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}

	private drawNightTintOn(ctx: CanvasRenderingContext2D, strength: number) {
		if (strength <= 0) return;
		const { canvas } = ctx;

		ctx.save();
		// screen-space overlay
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Natural darkening that preserves highlights
		ctx.globalCompositeOperation = "multiply";
		ctx.fillStyle = `rgba(10, 20, 60, ${0.75 * strength})`; // moonlit blue
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Gentle cool cast for depth (optional)
		ctx.globalCompositeOperation = "overlay";
		ctx.fillStyle = `rgba(0, 10, 40, ${0.15 * strength})`;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.restore();
	}

	/* ---------- Loading / data ---------- */

	loadImageAssets() {
		const loadOnlyMapAssets = false;
		if (loadOnlyMapAssets) {
			const imageCodes = new Set<number>();
			for (const row of this.ground) {
				for (const column of row) {
					for (const tile of Array.isArray(column) ? column : [column]) {
						imageCodes.add(tile);
					}
				}
			}
			this.imageAssetSet.loadImages(Array.from(imageCodes));
		} else {
			this.imageAssetSet.loadImages();
		}
	}

	hasLoaded() {
		const imageAssets = this.imageAssetSet.imageAssets.filter(
			(imageAsset) => imageAsset.image,
		);
		const imagesHaveLoaded =
			imageAssets.length > 0 &&
			imageAssets.every(
				(imageAsset) => imageAsset.image && imageHasLoaded(imageAsset.image),
			);
		return imagesHaveLoaded;
	}

	async load() {
		this.loadImageAssets();
		await delayUntil(() => this.hasLoaded());
	}

	// Updates the ground using the structuredClone
	updateGround(ground: MapData) {
		this.ground = structuredClone(ground);
		this.rows = ground.length;
		this.columns = Math.max(...ground.map((r) => r.length));
	}

	// Updates the entities
	updateEntities(entities: Entity[]) {
		for (const entity of entities) {
			entity.animationStartMs = undefined;
		}
		this.entities = entities;

		/* 
			NOTE - Until I can work out a more performant way to implement lighting, 
			I'm going to disable it for now. Was fun though.

			Also, we'd need a way to embed this into the imageAssetSet or 
			entity metadata so that we can know how to light it up,
			rather than hard-coded here.
		*/
		// this.entities.forEach((e: Entity) => {
		// 	if ([12, 13, 14, 27, 32].includes(e.code)) {
		// 		this.addGlow({
		// 			row: e.anchor[0],
		// 			col: e.anchor[1],
		// 			offsetPx: [32, 16], // Half of the image asset size
		// 			radius: 20,
		// 			alpha: 0.4,
		// 			linkToNight: true,
		// 			onAbove: 0.5,
		// 			offBelow: 0.4,
		// 		});
		// 	}
		// });
	}

	getMapCoords() {
		const offsetX =
			this.rows *
				(this.imageAssetSet.baseTileWidth / 2) *
				this.camera.zoomLevel -
			(this.imageAssetSet.baseTileWidth / 2) * this.camera.zoomLevel;
		const mapRowsPixels =
			this.rows * this.imageAssetSet.baseTileWidth * this.camera.zoomLevel;
		const mapColumnsPixels =
			this.columns * this.imageAssetSet.baseTileHeight * this.camera.zoomLevel;
		const centerX = this.target.width / 2 + offsetX;
		const centerY = this.target.height / 2;
		const mapX = centerX - mapRowsPixels / 2 + this.camera.panX;
		const mapY = centerY - mapColumnsPixels / 2 + this.camera.panY;
		return { mapX, mapY };
	}

	drawCursorAt(
		row: number,
		col: number,
		imageAsset?: ImageAsset | null | undefined,
	) {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx) return;

		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});
		const tfSnap = snapped(tf);

		if (!this._metrics || !this._bounds) return;

		const rTiles = imageAsset?.size?.[0] ?? 1;
		const cTiles = imageAsset?.size?.[1] ?? 1;

		const anchorRowOffset = -(rTiles - 1);
		const anchorColOffset = -(cTiles - 1);

		const startRow = row + anchorRowOffset;
		const startCol = col + anchorColOffset;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = true;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * this.camera.zoomLevel;

		const tW = this._metrics.W * this.camera.zoomLevel;
		const tH = this._metrics.H * this.camera.zoomLevel;

		let minTopY = Infinity;
		let maxBottomY = -Infinity;
		let minLeftX = Infinity;
		let maxRightX = -Infinity;

		for (let dr = 0; dr < rTiles; dr++) {
			for (let dc = 0; dc < cTiles; dc++) {
				const r = startRow + dr;
				const c = startCol + dc;

				const { wx, wy } = rcToWorldTopLeft(r, c, this._metrics, this._bounds);
				const { x, y } = worldToScreen(wx, wy, tfSnap);

				const topY = y;
				const bottomY = y + tH;
				const leftX = x;
				const rightX = x + tW;

				if (topY < minTopY) minTopY = topY;
				if (bottomY > maxBottomY) maxBottomY = bottomY;
				if (leftX < minLeftX) minLeftX = leftX;
				if (rightX > maxRightX) maxRightX = rightX;
			}
		}

		const midX = (minLeftX + maxRightX) / 2;
		const midY = (minTopY + maxBottomY) / 2;

		ctx.beginPath();
		ctx.moveTo(midX, minTopY);
		ctx.lineTo(maxRightX, midY);
		ctx.lineTo(midX, maxBottomY);
		ctx.lineTo(minLeftX, midY);
		ctx.closePath();
		ctx.stroke();

		ctx.restore();
	}

	clearCursor() {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
	}

	drawPreview(tiles: [number, number][]) {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx || !this._metrics || !this._bounds) return;

		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});
		const tfSnap = snapped(tf);

		const W = this._metrics.W;
		const H = this._metrics.H;
		const zoom = this.camera.zoomLevel;
		const tileWScreen = W * zoom;
		const tileHScreen = H * zoom;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = true;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * zoom;

		for (const [row, col] of tiles) {
			const { wx, wy } = rcToWorldTopLeft(
				row,
				col,
				this._metrics,
				this._bounds,
			);
			const { x, y } = worldToScreen(wx, wy, tfSnap);

			ctx.beginPath();
			ctx.moveTo(x + tileWScreen / 2, y);
			ctx.lineTo(x + tileWScreen, y + tileHScreen / 2);
			ctx.lineTo(x + tileWScreen / 2, y + tileHScreen);
			ctx.lineTo(x, y + tileHScreen / 2);
			ctx.closePath();
			ctx.stroke();
		}

		ctx.restore();
	}

	clearPreview() {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx) {
			console.error("Failed to get canvas context");
			return;
		}
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
	}

	sampleBackground() {
		const ctx = this.target.getContext("2d");
		if (!ctx) return;

		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});

		const tfSnap = snapped(tf);

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.target.width, this.target.height);
		ctx.imageSmoothingEnabled = true;

		ctx.setTransform(tfSnap.zoom, 0, 0, tfSnap.zoom, tfSnap.e, tfSnap.f);
		ctx.drawImage(this.background, 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	draw() {
		return this.sampleBackground();
	}

	drawBackground() {
		const ctx = this.background.getContext("2d");
		if (!ctx) return;

		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;

		const Wmax = W;
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		const metrics = { W, H, Wmax, Hmax, rows: this.rows, cols: this.columns };
		const bounds = measureMapBounds(metrics);

		this.background.width = bounds.bgW;
		this.background.height = bounds.bgH;

		ctx.imageSmoothingEnabled = true;
		ctx.clearRect(0, 0, bounds.bgW, bounds.bgH);

		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.columns; c++) {
				const codes = this.ground[r][c];
				const drawOne = (code: number) => {
					const tile = this.imageAssetSet.imageAssets.find(
						(t) => t.code === code,
					);
					if (!tile?.image) return;

					const tW = tile.width ?? W;
					const tH = tile.height ?? H;

					const { wx, wy } = rcToWorldTopLeft(r, c, metrics, bounds);
					const x = wx + (W - tW) / 2;
					const y = wy - (tH - H);
					ctx.drawImage(tile.image, 0, 0, tW, tH, x, y, tW, tH);
				};

				if (Array.isArray(codes)) codes.forEach(drawOne);
				else drawOne(codes);
			}
		}

		this._bounds = bounds;
		this._metrics = metrics;
	}

	fitsOnMap({
		position,
		imageAsset,
	}: {
		position: [number, number];
		imageAsset: ImageAsset;
	}) {
		const [row, column] = position;

		const withinMapRowRange =
			row - (imageAsset.size[0] - 1) >= 0 &&
			row + (imageAsset.anchor[0] - 1) <= this.rows;
		const withinMapColumnRange =
			column - (imageAsset.size[1] - 1) >= 0 &&
			column + (imageAsset.anchor[1] - 1) <= this.columns;
		return withinMapRowRange && withinMapColumnRange;
	}

	addEntity({
		position,
		imageAsset,
	}: {
		position: [number, number];
		imageAsset: ImageAsset;
	}) {
		const entity: Entity = {
			id: crypto.randomUUID(),
			anchor: position,
			code: imageAsset.code,
			size: imageAsset.size,
			orientation: "se",
			elevation: 0,
			offsetPx: [0, 0],
			metadata: {},
		};

		this.entities.push(entity);
	}

	clearEntitiesInArea(area: [number, number, number, number]) {
		const [x0, y0, x1, y1] = area;
		const fromRow = Math.min(x0, x1);
		const toRow = Math.max(x0, x1);
		const fromCol = Math.min(y0, y1);
		const toCol = Math.max(y0, y1);
		this.entities = this.entities.filter((entity) => {
			const [ex, ey] = entity.anchor;
			const entityIsInArea =
				ex >= fromRow && ex <= toRow && ey >= fromCol && ey <= toCol;
			return !entityIsInArea;
		});
	}

	resizeCanvases() {
		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		this.background.width = Math.ceil(((this.rows + this.columns) * W) / 2);
		this.background.height = Math.ceil(
			((this.rows + this.columns) * H) / 2 + (Hmax - H),
		);

		const canvasElements = [this.target, this.cursorTarget];
		canvasElements.forEach((canvas) => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});

		this.drawBackground();
		this.draw();
	}

	animate() {
		const tick = (now: number) => {
			this.renderFrame(now);
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	renderFrame(perfNow: number) {
		// advance night animation
		if (this.nightAnim) {
			const { start, duration, from, to, onDone } = this.nightAnim;
			const t = Math.min(1, (perfNow - start) / duration);
			const k = this.easeInOut(t);
			this.nightProgress = from + (to - from) * k;
			if (t >= 1) {
				this.nightAnim = null;
				onDone?.();
			}
		}

		// 1) background → target
		this.sampleBackground();
		// 2) entities
		this.drawAnimatedEntities(perfNow);

		// 3) tint
		if (this.nightProgress > 0) {
			if (this.nightApplyTarget === "map") {
				const ctx = this.target.getContext("2d");
				if (ctx) this.drawNightTintOn(ctx, this.nightProgress);
			} else {
				const bctx = this.background.getContext("2d");
				if (bctx) this.drawNightTintOn(bctx, this.nightProgress);
			}
		}

		// 4) draw additive glows on the map after tint so they "light" the scene
		this.drawGlows();
	}

	private drawAnimatedEntities(perfNow: number) {
		const ctx = this.target.getContext("2d");
		if (!ctx || !this._metrics || !this._bounds) return;

		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});
		const tfSnap = snapped(tf);

		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;

		const toDraw = this.entities
			.slice()
			.sort((a, b) => a.anchor[0] + a.anchor[1] - (b.anchor[0] + b.anchor[1]));

		ctx.imageSmoothingEnabled = true;
		ctx.setTransform(tfSnap.zoom, 0, 0, tfSnap.zoom, tfSnap.e, tfSnap.f);

		for (const entity of toDraw) {
			const asset = this.imageAssetSet.imageAssets.find(
				(a) => a.code === entity.code,
			);
			if (!asset?.image) continue;

			const { wx, wy } = rcToWorldTopLeft(
				entity.anchor[0],
				entity.anchor[1],
				this._metrics,
				this._bounds,
			);
			const drawX =
				wx + (W - (asset.width ?? W)) / 2 + (entity.offsetPx?.[0] ?? 0);
			const drawY =
				wy - ((asset.height ?? H) - H) + (entity.offsetPx?.[1] ?? 0);

			if (!asset.sprite) {
				const tW = asset.width ?? W;
				const tH = asset.height ?? H;
				ctx.drawImage(asset.image, 0, 0, tW, tH, drawX, drawY, tW, tH);
				continue;
			}

			const { sx, sy, sw, sh } = this.computeSpriteSourceRect(
				asset,
				entity,
				perfNow,
			);
			const destW = asset.width ?? sw;
			const destH = asset.height ?? sh;
			ctx.drawImage(asset.image, sx, sy, sw, sh, drawX, drawY, destW, destH);
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	private computeSpriteSourceRect(
		asset: ImageAsset,
		entity: Entity,
		perfNow: number,
	) {
		const sprite = asset.sprite as SpriteMeta;
		const defaultAnimName =
			(sprite as SpriteMeta)?.defaultAnimation ??
			Object.keys((sprite as SpriteMeta)?.animations ?? {})[0];
		const animName = entity.animationName ?? defaultAnimName;

		const anim =
			(sprite as SpriteMeta)?.animations?.[animName] ??
			(sprite as SpriteMeta)?.animations?.[defaultAnimName];

		if (!anim) {
			if ((sprite as SpriteMeta).mode === "rects") {
				const r = (sprite as RectsSpriteMeta).rects?.[0] ?? {
					x: 0,
					y: 0,
					w: asset.width,
					h: asset.height,
				};
				return { sx: r.x, sy: r.y, sw: r.w, sh: r.h };
			}
			const [fw, fh] = (sprite as GridSpriteMeta).frameSize ?? [
				asset.width,
				asset.height,
			];
			return { sx: 0, sy: 0, sw: fw, sh: fh };
		}

		if (entity.animationStartMs == null) {
			entity.animationStartMs = perfNow;
		}

		if (typeof entity.animationFrameOverride === "number") {
			const frameIndex =
				anim.frames[entity.animationFrameOverride] ?? anim.frames[0];
			return this.frameIndexToRect(sprite, frameIndex);
		}

		if (entity.animationPaused) {
			const frameIndex = anim.frames[0];
			return this.frameIndexToRect(sprite, frameIndex);
		}

		const elapsed = perfNow - (entity.animationStartMs ?? perfNow);
		const frames: number[] = anim.frames;
		const per: number = anim.frameDurationMs ?? 100;
		const loop: string = anim.loop ?? "loop";

		switch (loop) {
			case "hold": {
				const idx = Math.min(frames.length - 1, Math.floor(elapsed / per));
				return this.frameIndexToRect(sprite, frames[idx]);
			}
			case "pingpong": {
				const period = Math.max(1, (frames.length - 1) * 2);
				const step = Math.floor((elapsed / per) % period);
				const goingForward = step < frames.length - 1;
				const i = goingForward
					? step
					: frames.length - 1 - (step - (frames.length - 1));
				return this.frameIndexToRect(sprite, frames[i]);
			}
			default: {
				const idx = Math.floor(elapsed / per) % frames.length;
				return this.frameIndexToRect(sprite, frames[idx]);
			}
		}
	}

	private frameIndexToRect(
		sprite: NonNullable<ImageAsset["sprite"]>,
		frameIndex: number,
	) {
		const s: SpriteMeta = sprite;

		if (s.mode === "rects") {
			const r = s.rects?.[frameIndex] ??
				s.rects?.[0] ?? { x: 0, y: 0, w: 0, h: 0 };
			return { sx: r.x, sy: r.y, sw: r.w, sh: r.h };
		}

		const [fw, fh] = s.frameSize ?? [0, 0];
		const cols: number = s.grid?.cols ?? 1;
		const rows: number = s.grid?.rows ?? 1;
		const order: "row-major" | "col-major" = s.grid?.order ?? "row-major";

		let row: number, col: number;
		if (order === "row-major") {
			row = Math.floor(frameIndex / cols);
			col = frameIndex % cols;
		} else {
			col = Math.floor(frameIndex / rows);
			row = frameIndex % rows;
		}

		return { sx: col * fw, sy: row * fh, sw: fw, sh: fh };
	}
}

export default GameMap;
