import type ImageAssetSet from "./assets/ImageAssetSet";
import type Camera from "./Camera";
import type { MapData } from "./types";
import { delayUntil, imageHasLoaded } from "./utils";

// --- helpers / local state ---
const worldToScreen = (
	wx: number,
	wy: number,
	zoom: number,
	e: number,
	f: number,
) => ({
	x: Math.round(wx * zoom + e),
	y: Math.round(wy * zoom + f),
});

class GameMap {
	background: HTMLCanvasElement;
	target: HTMLCanvasElement;
	cursorTarget: HTMLCanvasElement;
	camera: Camera;
	map: MapData;
	rows: number;
	columns: number;
	selectedTile: [number, number] | null = null;
	imageAssetSet: ImageAssetSet;
	constructor({
		background,
		target,
		cursorTarget,
		camera,
		map,
		imageAssetSet,
	}: {
		background: HTMLCanvasElement;
		target: HTMLCanvasElement;
		cursorTarget: HTMLCanvasElement;
		camera: Camera;
		map: MapData;
		imageAssetSet: ImageAssetSet;
	}) {
		this.background = background;
		this.target = target;
		this.cursorTarget = cursorTarget;
		this.camera = camera;
		this.map = map;
		this.imageAssetSet = imageAssetSet;
		this.draw = this.draw.bind(this);
		this.loadImageAssets = this.loadImageAssets.bind(this);
		this.hasLoaded = this.hasLoaded.bind(this);
		this.load = this.load.bind(this);
		this.getMapCoords = this.getMapCoords.bind(this);
		this.sampleBackground = this.sampleBackground.bind(this);
		this.rows = map.length;
		// TODO - check that the map columns are equal for all rows? - Perhaps we want to draw unusual shaped maps in the future - maybe like the inside of a building with curved walls as an example, or game maps that look like levels with rooms?
		// Actually - we might want to create maps like dungeons as an example - we'd need to be able to do that
		this.columns = map[0].length;
	}

	loadImageAssets() {
		const loadOnlyMapAssets = false;
		if (loadOnlyMapAssets) {
			const imageCodes = new Set<number>();
			for (const row of this.map) {
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

	// Updates the map using the structuredClone
	updateMap(map: MapData) {
		this.map = structuredClone(map);
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

	drawCursorAt(row: number, column: number) {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx) {
			console.error("Failed to get canvas context");
			return;
		}

		// Clear overlay (draw in screen space)
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = false;

		// Match the transform used in sampleBackground()
		const zoom = this.camera.zoomLevel;
		const panX = this.camera.panX; // screen px
		const panY = this.camera.panY;

		let e = this.target.width / 2 + panX - (this.background.width * zoom) / 2;
		let f = this.target.height / 2 + panY - (this.background.height * zoom) / 2;
		e = Math.round(e);
		f = Math.round(f);

		// World origin and sizes
		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;
		const R = this.rows;
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		const mapX = ((R - 1) * W) / 2;
		const mapY = Hmax - H;

		// Pick a tile (if stacked, use the first;)
		const tileCode = this.map[row][column];
		const code = Array.isArray(tileCode) ? tileCode[0] : tileCode;
		const tile = this.imageAssetSet.imageAssets.find((t) => t.code === code);

		const tW = tile?.width ?? W; // sprite width (may equal W)
		const tH = tile?.height ?? H; // sprite height (>= H if tall)

		// Compute the tile top-left in WORLD pixels (same math as drawBackground)
		const wx = ((column - row) * tW) / 2 + mapX;
		const wy = ((column + row) * H) / 2 + mapY - (tH - H);

		// Convert to SCREEN pixels with the same transform
		const { x, y } = worldToScreen(wx, wy, zoom, e, f);

		// Draw a base-footprint diamond (W x H), scaled by zoom, in screen space
		const tileWScreen = W * zoom;
		const tileHScreen = H * zoom;

		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * zoom; // stays visually consistent under zoom
		ctx.beginPath();
		ctx.moveTo(x + tileWScreen / 2, y);
		ctx.lineTo(x + tileWScreen, y + tileHScreen / 2);
		ctx.lineTo(x + tileWScreen / 2, y + tileHScreen);
		ctx.lineTo(x, y + tileHScreen / 2);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}

	drawPreview(tiles: [number, number][]) {
		const ctx = this.cursorTarget.getContext("2d");
		if (!ctx) {
			console.error("Failed to get canvas context");
			return;
		}

		// ----- helpers -----
		const worldToScreen = (
			wx: number,
			wy: number,
			zoom: number,
			e: number,
			f: number,
		) => ({
			x: Math.round(wx * zoom + e),
			y: Math.round(wy * zoom + f),
		});

		// ----- clear + screen-space setup -----
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.cursorTarget.width, this.cursorTarget.height);
		ctx.imageSmoothingEnabled = false;

		// Match the transform used in sampleBackground()
		const zoom = this.camera.zoomLevel;
		const panX = this.camera.panX; // screen pixels
		const panY = this.camera.panY;

		let e = this.target.width / 2 + panX - (this.background.width * zoom) / 2;
		let f = this.target.height / 2 + panY - (this.background.height * zoom) / 2;
		e = Math.round(e);
		f = Math.round(f);

		// World origin & base sizes (zoom = 1)
		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;
		const R = this.rows;
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		const mapX = ((R - 1) * W) / 2;
		const mapY = Hmax - H;

		// ----- draw each preview diamond in screen space -----
		ctx.save();
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2 * zoom;

		const tileWScreen = W * zoom;
		const tileHScreen = H * zoom;

		for (const [row, column] of tiles) {
			const tileCode = this.map[row][column];
			const code = Array.isArray(tileCode) ? tileCode[0] : tileCode;
			const tile = this.imageAssetSet.imageAssets.find((t) => t.code === code);

			const tW = tile?.width ?? W; // sprite width used in background draw
			const tH = tile?.height ?? H; // sprite height used in background draw

			// World top-left of this tile (match drawBackground math)
			const wx = ((column - row) * tW) / 2 + mapX;
			const wy = ((column + row) * H) / 2 + mapY - (tH - H);

			// Convert to screen
			const { x, y } = worldToScreen(wx, wy, zoom, e, f);

			// Draw W×H diamond footprint (scaled by zoom)
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
		if (!ctx) {
			console.error("Failed to get canvas context");
			return;
		}

		// 1) Clear with identity (screen space)
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.target.width, this.target.height);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		const zoom = this.camera.zoomLevel;
		const panX = this.camera.panX; // in screen pixels
		const panY = this.camera.panY;

		const bgW = this.background.width;
		const bgH = this.background.height;
		const tgtW = this.target.width;
		const tgtH = this.target.height;

		// 3) Compute translation so that at pan = 0 the background is centered.
		//    We set the transform to: scale(zoom) then translate(e, f) in SCREEN pixels.
		//    With drawImage(..., 0,0), the top-left of the background will land at (e,f).
		//    To center: e = screenCenterX - scaledHalfBgW (+ panX), same for Y.
		let e = tgtW / 2 + panX - (bgW * zoom) / 2;
		let f = tgtH / 2 + panY - (bgH * zoom) / 2;

		// 4) Optional: snap translation to whole pixels for crisp pixel-art
		// (This avoids subpixel sampling of the scaled background.)
		e = Math.round(e);
		f = Math.round(f);

		// 5) Apply matrix and draw once
		ctx.setTransform(zoom, 0, 0, zoom, e, f);
		ctx.drawImage(this.background, 0, 0);

		// 6) Restore if you draw overlays in screen-space afterwards
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	draw() {
		return this.sampleBackground();
	}

	drawBackground() {
		const W = this.imageAssetSet.baseTileWidth;
		const H = this.imageAssetSet.baseTileHeight;
		const R = this.rows;
		const C = this.columns;

		const Wmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.width ?? W),
		);
		const Hmax = Math.max(
			...this.imageAssetSet.imageAssets.map((a) => a.height ?? H),
		);

		// Fit the widest/tallest sprite to avoid clipping
		this.background.width = Math.ceil(((R + C) * W) / 2 + (Wmax - W));
		this.background.height = Math.ceil(((R + C) * H) / 2 + (Hmax - H));

		// World origin for the grid (snug, and centered for wide sprites)
		const mapX = ((R - 1) * W) / 2 + (Wmax - W) / 2;
		const mapY = Hmax - H;

		const ctx = this.background.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, this.background.width, this.background.height);

		for (let row = 0; row < R; row++) {
			for (let col = 0; col < C; col++) {
				const codes = this.map[row][col];
				const drawOne = (code: number) => {
					const tile = this.imageAssetSet.imageAssets.find(
						(t) => t.code === code,
					);
					if (!tile?.image) return;

					const tW = tile.width ?? W;
					const tH = tile.height ?? H;

					// Place on the W×H lattice, center sprite horizontally, lift by overhang vertically
					const x = ((col - row) * W) / 2 + mapX + (W - tW) / 2;
					const y = ((col + row) * H) / 2 + mapY - (tH - H);

					ctx.drawImage(tile.image, 0, 0, tW, tH, x, y, tW, tH);
				};
				if (Array.isArray(codes)) codes.forEach(drawOne);
				else drawOne(codes);
			}
		}
	}
}

export default GameMap;
