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
import type { Entity, ImageAsset, MapData } from "./types";
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
		this.rows = this.ground.length;
		// This will find the maximum number of columns in a row within the ground
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
		this.entities = structuredClone(entities);
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

		const { W, H } = this._metrics;

		// Footprint in tiles (rows x cols)
		const rTiles = imageAsset?.size?.[0] ?? 1;
		const cTiles = imageAsset?.size?.[1] ?? 1;

		// ---- Anchor: bottom-center of the footprint ----
		// (row,col) is the tile under the mouse cursor, i.e. the anchor.
		// Shift the rectangle so that its bottom-center lands on (row,col).
		const anchorRowOffset = -(rTiles - 1); // shift up by (rows-1)
		const anchorColOffset = -Math.floor(cTiles / 2); // center horizontally

		const startRow = row + anchorRowOffset; // top-left tile of footprint
		const startCol = col + anchorColOffset;

		// Canvas prep
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = false;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * this.camera.zoomLevel;

		const tW = W * this.camera.zoomLevel;
		const tH = H * this.camera.zoomLevel;

		// --- Compute a single bounding diamond over the rectangular footprint ---
		// We do this by scanning all tiles in the footprint to find:
		//   min top Y (top of any tile), max bottom Y, min left X, max right X.
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

				// Single tile diamond vertices in screen space
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

		// Build the same view transform as sampleBackground()
		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.background.width,
			bgH: this.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});
		const tfSnap = snapped(tf); // snap only for crisp on-screen lines

		const W = this._metrics.W;
		const H = this._metrics.H;
		const zoom = this.camera.zoomLevel;
		const tileWScreen = W * zoom;
		const tileHScreen = H * zoom;

		// Clear overlay in screen space
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = false;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * zoom;

		for (const [row, col] of tiles) {
			// World top-left of this tile's base footprint (W×H lattice)
			const { wx, wy } = rcToWorldTopLeft(
				row,
				col,
				this._metrics,
				this._bounds,
			);

			// Convert to screen using the same (snapped) transform as rendering
			const { x, y } = worldToScreen(wx, wy, tfSnap);

			// Draw the diamond footprint (W×H) in screen space
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

		const tfSnap = snapped(tf); // for crisp rendering

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
		const Wmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.width ?? W),
		);
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		const metrics = { W, H, Wmax, Hmax, rows: this.rows, cols: this.columns };
		const bounds = measureMapBounds(metrics);

		this.background.width = bounds.bgW;
		this.background.height = bounds.bgH;

		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, bounds.bgW, bounds.bgH);

		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.columns; c++) {
				const codes = this.ground[r][c];
				const drawOne = (code: number) => {
					const tile = this.imageAssetSet.imageAssets.find(
						(t) => t.code === code,
					);
					if (!tile?.image) return;

					// base-grid placement + sprite centering
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

		/*
			This adds the entities to the map, based on their anchor 
			position within the map
			
			Maybe it belongs in its own function? Maybe
		*/
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.columns; c++) {
				const entity = this.entities.find(
					(e) => e.anchor[0] === r && e.anchor[1] === c,
				);
				if (!entity) continue;
				const tile = this.imageAssetSet.imageAssets.find(
					(t) => t.code === entity.code,
				);
				if (!tile?.image) continue;

				const { wx, wy } = rcToWorldTopLeft(
					entity.anchor[0],
					entity.anchor[1],
					metrics,
					bounds,
				);
				const x = wx + (W - tile.width) / 2;
				const y = wy - (tile.height - H);

				ctx.drawImage(
					tile.image,
					0,
					0,
					tile.width,
					tile.height,
					x,
					y,
					tile.width,
					tile.height,
				);
			}
		}

		// Store for reuse
		this._bounds = bounds;
		this._metrics = metrics;
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

	// What if we're dragging area from bottom to top, right to left? order of rows/columns wouldn't be sorted - we need to sort the selected area
	clearEntitiesInArea(area: [number, number, number, number]) {
		const [x0, y0, x1, y1] = area;
		const fromRow = Math.min(x0, x1);
		const toRow = Math.max(x0, x1);
		const fromCol = Math.min(y0, y1);
		const toCol = Math.max(y0, y1);
		this.entities = this.entities.filter((entity) => {
			const [ex, ey] = entity.anchor;
			// const tr = ex + (entity.size?.[0] ?? 1) - 1; // bottom row of entity footprint
			// const tc = ey + (entity.size?.[1] ?? 1) - 1; // earliest column of entity footprint

			// TODO - expand to cover all tiles occupied by the entity
			const entityIsInArea =
				ex >= fromRow && ex <= toRow && ey >= fromCol && ey <= toCol;
			// || (tr >= fromRow && tr <= toRow && tc >= fromCol && tc <= toCol);

			// We allow entities that are not within the area to remain
			return !entityIsInArea;
		});
	}
}
export default GameMap;
