import type EventEmitter from "@anephenix/event-emitter";
import type Camera from "../Camera";
import type GameMap from "../GameMap";
import type { PaintConstraint } from "../types";

type Tile = [row: number, col: number];
type AxisLock = "row" | "col" | null;

class Cursor {
	x: number;
	y: number;
	target?: HTMLCanvasElement | null;
	gameMap?: GameMap | null;
	camera?: Camera | null;
	eventEmitter: InstanceType<typeof EventEmitter>;
	enablePainting: boolean = false;

	// painting state
	private isPainting = false;
	private strokeTiles: Tile[] = [];
	private strokeSeen = new Set<string>();
	private strokeStart: Tile | null = null;

	// constraint + axis lock
	paintConstraint: PaintConstraint = "diagonal";
	private axisLock: AxisLock = null; // for axial mode only
	private axisLockArmed = false; // becomes true after first movement

	constructor({
		target,
		eventEmitter,
	}: {
		target?: HTMLCanvasElement | null;
		eventEmitter: InstanceType<typeof EventEmitter>;
	}) {
		this.x = 0;
		this.y = 0;
		if (target) this.target = target;
		this.eventEmitter = eventEmitter;

		this.onMouseMove = this.onMouseMove.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.setPaintConstraint = this.setPaintConstraint.bind(this);
		this.calculatePositionOnMap = this.calculatePositionOnMap.bind(this);
	}

	// --- public API to set default tool ---
	setPaintConstraint(mode: PaintConstraint) {
		this.paintConstraint = mode;
	}

	hasChanged(
		previous: number[] | null | undefined,
		next: number[] | null | undefined,
	) {
		if (!previous || !next) return true;
		return previous[0] !== next[0] || previous[1] !== next[1];
	}

	private tileKey([r, c]: Tile) {
		return `${r}:${c}`;
	}

	private rasterizeDiagonal(a: Tile, b: Tile): Tile[] {
		const out: Tile[] = [];

		// Is the row the same?
		if (a[0] === b[0]) {
			const [row, col0] = a;
			const [, col1] = b;
			const step = col1 > col0 ? 1 : -1;
			for (let c = col0; c !== col1 + step; c += step) {
				out.push([row, c]);
			}
			return out;
			// Is the column the same?
		} else if (a[1] === b[1]) {
			const [row0, col] = a;
			const [row1] = b;
			const step = row1 > row0 ? 1 : -1;
			for (let r = row0; r !== row1 + step; r += step) {
				out.push([r, col]);
			}
			return out;
		}
		return out;
	}

	// Axis-aligned in tile space with axis lock
	private rasterizeAxial(a: Tile, b: Tile): Tile[] {
		const [r0, c0] = a;
		const [r1, c1] = b;
		const dr = r1 - r0;
		const dc = c1 - c0;

		// Decide/keep lock
		if (!this.axisLockArmed) {
			// first movement decides axis by larger magnitude
			this.axisLock = Math.abs(dr) >= Math.abs(dc) ? "row" : "col";
			this.axisLockArmed = true;
		}

		const out: Tile[] = [];
		if (this.axisLock === "row") {
			// vary row, fixed col
			const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
			for (let r = r0; ; r += stepR) {
				out.push([r, c0]);
				if (r === r1 || stepR === 0) break;
			}
		} else {
			// vary col, fixed row
			const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
			for (let c = c0; ; c += stepC) {
				out.push([r0, c]);
				if (c === c1 || stepC === 0) break;
			}
		}
		return out;
	}

	// NEW: rectangular area AABB between a and b (inclusive)
	private rasterizeArea(a: Tile, b: Tile): Tile[] {
		const [r0, c0] = a;
		const [r1, c1] = b;
		const rMin = Math.min(r0, r1);
		const rMax = Math.max(r0, r1);
		const cMin = Math.min(c0, c1);
		const cMax = Math.max(c0, c1);
		const out: Tile[] = [];
		for (let r = rMin; r <= rMax; r++) {
			for (let c = cMin; c <= cMax; c++) {
				out.push([r, c]);
			}
		}
		return out;
	}

	private setStrokePreview(tiles: Tile[]) {
		tiles.forEach((tile) => {
			this.eventEmitter.emit("click", tile);
		});
		this.strokeTiles = tiles.slice();
		this.strokeSeen.clear();
		for (const t of this.strokeTiles) this.strokeSeen.add(this.tileKey(t));
		this.eventEmitter.emit("tiles:paint:preview", this.strokeTiles);
	}

	private startStrokeAt(tile: Tile) {
		this.isPainting = true;
		this.strokeStart = tile;
		this.axisLock = null;
		this.axisLockArmed = false;

		this.strokeTiles = [tile];
		this.strokeSeen.clear();
		this.strokeSeen.add(this.tileKey(tile));

		this.eventEmitter.emit("tiles:paint:start", tile);
		this.eventEmitter.emit("tiles:paint:preview", this.strokeTiles);
	}

	private extendStrokeTo(tile: Tile, constraint: PaintConstraint) {
		if (!this.isPainting || !this.strokeStart) return;

		let segment: Tile[];
		/*
      Note - what I want to do is the following:

      - Track the starting tile
      - Track the ending tile

      If the row of the start and end tile is the same, it is diagonal on that row
      If the column of the start and end tile is the same, it is diagonal on that column

      If they are not aligned, then it is an area
    */
		switch (constraint) {
			case "axial":
				segment = this.rasterizeAxial(this.strokeStart, tile);
				break;
			case "area":
				segment = this.rasterizeArea(this.strokeStart, tile);
				break;
			default: // case "diagonal"
				segment = this.rasterizeDiagonal(this.strokeStart, tile);
				break;
		}

		// clamp to map
		const rows = this.gameMap?.rows ?? Infinity;
		const cols = this.gameMap?.columns ?? Infinity;
		const clamped = segment.filter(
			([r, c]) => r >= 0 && c >= 0 && r < rows && c < cols,
		);

		this.setStrokePreview(clamped);
	}

	private endStroke() {
		if (!this.isPainting) return;
		this.isPainting = false;
		this.eventEmitter.emit("tiles:paint:end", this.strokeTiles.slice());
		this.eventEmitter.emit("tiles:apply", this.strokeTiles.slice());

		// reset
		this.strokeStart = null;
		this.axisLock = null;
		this.axisLockArmed = false;
	}

	// ---------- Mouse events ----------

	private onMouseDown(event: MouseEvent) {
		if (!this.target) return;
		if (!this.enablePainting) return;
		if (event.button !== 0) return; // left button only

		event.preventDefault();
		event.stopPropagation();

		const rect = this.target.getBoundingClientRect();
		this.x = event.clientX - rect.left;
		this.y = event.clientY - rect.top;

		const tile = this.pixelToTile(this.x, this.y);
		if (tile) {
			this.startStrokeAt(tile);
			this.gameMap?.draw();
		}
	}

	private onMouseUp(event: MouseEvent) {
		if (!this.enablePainting) return;
		if (!this.isPainting) return;

		event.preventDefault();
		event.stopPropagation();

		this.endStroke();
		this.gameMap?.draw();
	}

	private onMouseLeave() {
		if (!this.enablePainting) return;
		if (this.isPainting) this.endStroke();
	}

	onMouseMove(event: MouseEvent) {
		if (!this.target) return;

		const rect = this.target.getBoundingClientRect();
		this.x = event.clientX - rect.left;
		this.y = event.clientY - rect.top;

		if (this.isPainting) {
			const tile = this.pixelToTile(this.x, this.y);
			if (tile) {
				const active: PaintConstraint = this.paintConstraint;

				this.extendStrokeTo(tile, active);
				this.gameMap?.draw();
			}
			return;
		}

		// Normal hover highlight
		const currentSelectedTile = this.gameMap?.selectedTile;
		this.calculatePositionOnMap();
		if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
			this.gameMap?.draw();
		}
	}

	onClick(event: MouseEvent) {
		if (!this.target) return;
		if (this.isPainting) return;

		const rect = this.target.getBoundingClientRect();
		this.x = event.clientX - rect.left;
		this.y = event.clientY - rect.top;

		const currentSelectedTile = this.gameMap?.selectedTile;
		this.calculatePositionOnMap();
		for (const tile of this.strokeTiles) {
			this.eventEmitter.emit("click", tile);
		}
		if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
			this.gameMap?.draw();
		}
	}

	// ---------- Pixel → tile ----------

	private pixelToTile(px: number, py: number): Tile | null {
		if (!this.camera || !this.gameMap || !this.target) return null;

		const { zoomLevel, panX, panY } = this.camera;
		const rows = this.gameMap.rows;
		const cols = this.gameMap.columns;

		const TW = this.gameMap.imageAssetSet.baseTileWidth * zoomLevel;
		const TH = this.gameMap.imageAssetSet.baseTileHeight * zoomLevel;
		const HW = TW / 2;
		const HH = TH / 2;

		const MAP_H = (rows + cols) * HH;

		// Map-space
		const mx = px - panX;
		const my = py - panY;

		const ORIGIN_X = this.target.width / 2;
		const ORIGIN_Y = (this.target.height - MAP_H) / 2;

		const dx = mx - ORIGIN_X;
		const dy = my - ORIGIN_Y;

		const u = (dx / HW + dy / HH) / 2;
		const v = (dy / HH - dx / HW) / 2;

		let col = Math.floor(u);
		let row = Math.floor(v);

		const fu = u - (col + 0.5);
		const fv = v - (row + 0.5);

		if (Math.abs(fu) + Math.abs(fv) > 0.5) {
			if (fu > 0 && fv > 0) {
				col += 1;
				row += 1;
			} else if (fu > 0 && fv <= 0) {
				col += 1;
			} else if (fu <= 0 && fv > 0) {
				row += 1;
			}
		}

		if (row < 0 || col < 0 || row >= rows || col >= cols) return null;
		return [row, col];
	}

	calculatePositionOnMap() {
		if (!this.target) return null;
		const tile = this.pixelToTile(this.x, this.y);
		if (!tile || !this.gameMap) return null;
		this.gameMap.selectedTile = tile;
		return { row: tile[0], col: tile[1] };
	}

	attach({
		target,
		camera,
		gameMap,
	}: {
		target: HTMLCanvasElement;
		camera: Camera;
		gameMap: GameMap;
	}) {
		this.target = target;
		this.camera = camera;
		this.gameMap = gameMap;
		this.target.addEventListener("mousemove", this.onMouseMove);
		this.target.addEventListener("click", this.onClick);

		// capture phase so we win over the pan handler
		this.target.addEventListener("mousedown", this.onMouseDown, true);
		this.target.addEventListener("mouseup", this.onMouseUp, true);
		this.target.addEventListener("mouseleave", this.onMouseLeave, true);
	}

	detach() {
		this.target?.removeEventListener("mousemove", this.onMouseMove);
		this.target?.removeEventListener("click", this.onClick);
		this.target?.removeEventListener("mousedown", this.onMouseDown, true);
		this.target?.removeEventListener("mouseup", this.onMouseUp, true);
		this.target?.removeEventListener("mouseleave", this.onMouseLeave, true);
	}
}

export default Cursor;
