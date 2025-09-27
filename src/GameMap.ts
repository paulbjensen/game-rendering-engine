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
		this.clearEntitiesInArea = this.clearEntitiesInArea.bind(this);
		this.fitsOnMap = this.fitsOnMap.bind(this);

		this.renderFrame = this.renderFrame.bind(this);
		this.drawAnimatedEntities = this.drawAnimatedEntities.bind(this);
		this.computeSpriteSourceRect = this.computeSpriteSourceRect.bind(this);
		this.frameIndexToRect = this.frameIndexToRect.bind(this);

		this.rows = this.ground.length;
		this.columns = Math.max(...this.ground.map((r) => r.length));
	}

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
		// We need to set the rows and columns from the ground map
		this.rows = ground.length;
		this.columns = Math.max(...ground.map((r) => r.length));
	}

	// Updates the entities
	updateEntities(entities: Entity[]) {
		this.entities = entities;
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

		// Footprint in tiles (rows x cols)
		const rTiles = imageAsset?.size?.[0] ?? 1;
		const cTiles = imageAsset?.size?.[1] ?? 1;

		// ---- Anchor: bottom-center of the footprint ----
		const anchorRowOffset = -(rTiles - 1); // shift up by (rows-1)
		const anchorColOffset = -Math.floor(cTiles / 2); // center horizontally

		const startRow = row + anchorRowOffset; // top-left tile of footprint
		const startCol = col + anchorColOffset;

		// Canvas prep
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = true;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * this.camera.zoomLevel;

		const tW = this._metrics.W * this.camera.zoomLevel;
		const tH = this._metrics.H * this.camera.zoomLevel;

		// Determine bounding diamond for footprint
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

		// Diamond corners from those extrema
		const midX = (minLeftX + maxRightX) / 2;
		const midY = (minTopY + maxBottomY) / 2;

		ctx.beginPath();
		ctx.moveTo(midX, minTopY); // top
		ctx.lineTo(maxRightX, midY); // right
		ctx.lineTo(midX, maxBottomY); // bottom
		ctx.lineTo(minLeftX, midY); // left
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

		// Clear overlay in screen space
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

	/**
	 * Copies the pre-rendered background canvas to the target (view) canvas.
	 * Use this per frame before drawing dynamic/animated entities.
	 */
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

		const tfSnap = snapped(tf); // for crisp rendering

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.target.width, this.target.height);
		ctx.imageSmoothingEnabled = true;

		ctx.setTransform(tfSnap.zoom, 0, 0, tfSnap.zoom, tfSnap.e, tfSnap.f);
		ctx.drawImage(this.background, 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	/**
	 * For compatibility with existing callers that expect a single draw pass of the background.
	 * Prefer using renderFrame(perfNow) in your RAF loop for animations.
	 */
	draw() {
		return this.sampleBackground();
	}

	/**
	 * Pre-renders the static ground tiles into `background`.
	 * NOTE: entities are intentionally NOT drawn here anymore (to allow animation).
	 */
	drawBackground() {
		const ctx = this.background.getContext("2d");
		if (!ctx) return;

		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;

		// NOTE - keep Wmax minimal for iOS perf
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

		// --- draw static ground only ---
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.columns; c++) {
				const codes = this.ground[r][c];
				const drawOne = (code: number) => {
					const tile = this.imageAssetSet.imageAssets.find(
						(t) => t.code === code,
					);
					if (!tile?.image) return;

					// ground placement (center on W×H base footprint)
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

		// Store for reuse
		this._bounds = bounds;
		this._metrics = metrics;
	}

	/**
	 * Returns true if an asset (by its footprint/anchor) fits on the map bounds.
	 */
	fitsOnMap({
		position,
		imageAsset,
	}: {
		position: [number, number];
		imageAsset: ImageAsset;
	}) {
		const [row, column] = position;

		const withinMapRowRange =
			row - (imageAsset.size[0] - 1 + (imageAsset.anchor[0] - 1)) >= 0;
		const withinMapColumnRange =
			column - (imageAsset.size[1] - 1 + (imageAsset.anchor[1] - 1)) >= 0;
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
			// animation fields are optional; if omitted and asset has sprite,
			// default animation will be used automatically
		};

		this.entities.push(entity);
	}

	/**
	 * Removes entities whose anchor lies within the given area.
	 * (You may later expand to cover full footprints.)
	 */
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

	/* ===========================
	 *   ANIMATION RENDER PATH
	 * ===========================
	 */

	/**
	 * Call this from your RAF loop: requestAnimationFrame((now)=>gameMap.renderFrame(now))
	 * 1) Blits the pre-rendered background to target
	 * 2) Draws entities (animated if sprite metadata exists)
	 */
	renderFrame(perfNow: number) {
		// copy background to target (view)
		this.sampleBackground();
		// draw animated/dynamic entities on top
		this.drawAnimatedEntities(perfNow);
	}

	/**
	 * Draws entities onto `target` using current camera transform.
	 * Uses sprite frame selection if the asset defines a `sprite` block.
	 */
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

		// Optional: z-order by (row+col)
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
				// static entity
				const tW = asset.width ?? W;
				const tH = asset.height ?? H;
				ctx.drawImage(asset.image, 0, 0, tW, tH, drawX, drawY, tW, tH);
				continue;
			}

			// SPRITE: pick current frame (source rect) and draw
			const { sx, sy, sw, sh } = this.computeSpriteSourceRect(
				asset,
				entity,
				perfNow,
			);
			const destW = asset.width ?? sw;
			const destH = asset.height ?? sh;
			ctx.drawImage(asset.image, sx, sy, sw, sh, drawX, drawY, destW, destH);
		}

		// reset transform
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	/**
	 * Computes the source rectangle (sx,sy,sw,sh) to sample from the spritesheet
	 * based on the entity's animation state and the asset's sprite metadata.
	 */
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

		// Fallback if no animation config is present
		if (!anim) {
			// Use first frame of grid/rects
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

		// initialize start time if needed
		if (entity.animationStartMs == null) {
			entity.animationStartMs = perfNow;
			// entity.animationPingPongDir = 1; // kept for future use if you wish
		}

		// manual override?
		if (typeof entity.animationFrameOverride === "number") {
			const frameIndex =
				anim.frames[entity.animationFrameOverride] ?? anim.frames[0];
			return this.frameIndexToRect(sprite, frameIndex);
		}

		// paused? hold on first frame
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
				// e.g., for N frames, pingpong length = (N-1)*2
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

	/**
	 * Converts a logical frame index into a source rect depending on the sprite mode.
	 * - For `rects`, it indexes the explicit list.
	 * - For `grid`, it maps the index to (row,col) based on order and frame size.
	 */
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

		// grid mode
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
