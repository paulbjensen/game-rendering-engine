import type EventEmitter from "@anephenix/event-emitter";
import type Camera from "../../Camera";
import type GameMap from "../../GameMap";
import type { GridMetrics } from "../../lib/viewport/viewport";
import {
	getViewTransform,
	mouseToCanvasPx,
	pickTileAtScreenPoint,
} from "../../lib/viewport/viewport";
import type { PaintConstraint } from "../../types";

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
	private strokeStart: Tile | null = null;

	// constraint + axis lock
	paintConstraint: PaintConstraint = "diagonal";
	private axisLock: AxisLock = null; // for axial mode only
	private axisLockArmed = false; // becomes true after first movement

	// touch state
	private activeTouchId: number | null = null;
	private touchListenerOpts = { capture: true, passive: false } as const;

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

		// bind mouse
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);

		// bind touch
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
		this.onTouchCancel = this.onTouchCancel.bind(this);

		// others
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

	private rasterizeDiagonal(a: Tile, b: Tile): Tile[] {
		const out: Tile[] = [];

		// same row
		if (a[0] === b[0]) {
			const [row, col0] = a;
			const [, col1] = b;
			const step = col1 > col0 ? 1 : -1;
			for (let c = col0; c !== col1 + step; c += step) out.push([row, c]);
			return out;
		}
		// same column
		if (a[1] === b[1]) {
			const [row0, col] = a;
			const [row1] = b;
			const step = row1 > row0 ? 1 : -1;
			for (let r = row0; r !== row1 + step; r += step) out.push([r, col]);
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

		if (!this.axisLockArmed) {
			this.axisLock = Math.abs(dr) >= Math.abs(dc) ? "row" : "col";
			this.axisLockArmed = true;
		}

		const out: Tile[] = [];
		if (this.axisLock === "row") {
			const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
			for (let r = r0; ; r += stepR) {
				out.push([r, c0]);
				if (r === r1 || stepR === 0) break;
			}
		} else {
			const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
			for (let c = c0; ; c += stepC) {
				out.push([r0, c]);
				if (c === c1 || stepC === 0) break;
			}
		}
		return out;
	}

	// rectangular area AABB between a and b (inclusive)
	private rasterizeArea(a: Tile, b: Tile): Tile[] {
		const [r0, c0] = a;
		const [r1, c1] = b;
		const rMin = Math.min(r0, r1);
		const rMax = Math.max(r0, r1);
		const cMin = Math.min(c0, c1);
		const cMax = Math.max(c0, c1);
		const out: Tile[] = [];
		for (let r = rMin; r <= rMax; r++) {
			for (let c = cMin; c <= cMax; c++) out.push([r, c]);
		}
		return out;
	}

	private setStrokePreview(tiles: Tile[]) {
		this.eventEmitter.emit("drawPreview", tiles);
		this.strokeTiles = tiles.slice();
	}

	private startStrokeAt(tile: Tile) {
		this.isPainting = true;
		this.strokeStart = tile;
		this.axisLock = null;
		this.axisLockArmed = false;
		this.strokeTiles = [tile];
	}

	private extendStrokeTo(tile: Tile, constraint: PaintConstraint) {
		if (!this.isPainting || !this.strokeStart) return;

		let segment: Tile[];
		switch (constraint) {
			case "axial":
				segment = this.rasterizeAxial(this.strokeStart, tile);
				break;
			case "area":
				segment = this.rasterizeArea(this.strokeStart, tile);
				break;
			default:
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

		// reset
		this.strokeStart = null;
		this.axisLock = null;
		this.axisLockArmed = false;
		this.eventEmitter.emit("clearPreview");
	}

	// ---------- Mouse events ----------

	private onMouseDown(event: MouseEvent) {
		if (!this.target) return;
		if (!this.enablePainting) return;
		if (event.button !== 0) return; // left button only

		event.preventDefault();
		event.stopPropagation();
		const { x, y } = mouseToCanvasPx(this.target, event);
		this.x = x;
		this.y = y;
		const tile = this.pixelToTile(x, y);
		if (tile) {
			this.startStrokeAt(tile);
			this.setStrokePreview([tile]);
		}
	}

	private onMouseUp(event: MouseEvent) {
		if (!this.enablePainting) return;
		if (!this.isPainting) return;

		event.preventDefault();
		event.stopPropagation();

		this.endStroke();
		this.eventEmitter.emit("clickBatch", this.strokeTiles);
	}

	private onMouseLeave() {
		if (!this.enablePainting) return;
		if (this.isPainting) this.endStroke();
	}

	onMouseMove(event: MouseEvent) {
		if (!this.target) return;

		const { x, y } = mouseToCanvasPx(this.target, event);
		this.x = x;
		this.y = y;

		if (this.isPainting) {
			const tile = this.pixelToTile(x, y);
			if (tile) {
				const active: PaintConstraint = this.paintConstraint;
				this.extendStrokeTo(tile, active);
			}
			return;
		}
		// Normal hover highlight
		const currentSelectedTile = this.gameMap?.selectedTile;
		this.calculatePositionOnMap();
		if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
			if (this.gameMap?.selectedTile)
				this.gameMap?.drawCursorAt(...this.gameMap.selectedTile);
		}
	}

	onClick(event: MouseEvent) {
		if (!this.target) return;
		if (this.isPainting) return;

		const { x, y } = mouseToCanvasPx(this.target, event);
		this.x = x;
		this.y = y;
		const currentSelectedTile = this.gameMap?.selectedTile;
		this.calculatePositionOnMap();
		if (this.hasChanged(currentSelectedTile, this.gameMap?.selectedTile)) {
			this.gameMap?.draw();
		}
	}

	// ---------- Touch helpers & events ----------

	private touchToCanvasPx(
		canvas: HTMLCanvasElement,
		ev: TouchEvent,
		touchId?: number,
	) {
		const touch =
			touchId == null
				? ev.changedTouches[0]
				: (Array.from(ev.touches).find((t) => t.identifier === touchId) ??
					Array.from(ev.changedTouches).find((t) => t.identifier === touchId));

		if (!touch) return null;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (touch.clientX - rect.left) * scaleX,
			y: (touch.clientY - rect.top) * scaleY,
			identifier: touch.identifier,
		};
	}

	private onTouchStart(ev: TouchEvent) {
		if (!this.target) return;

		// If painting is disabled, let Touch.ts handle gestures (pan/pinch)
		if (!this.enablePainting) return;

		// Only claim single-finger touches for painting; let 2+ fingers bubble
		if (ev.touches.length !== 1) return;

		// We are taking ownership of this single-finger gesture
		ev.preventDefault();

		if (this.activeTouchId != null) return;

		const pt = this.touchToCanvasPx(this.target, ev);
		if (!pt) return;

		this.activeTouchId = pt.identifier;
		this.x = pt.x;
		this.y = pt.y;

		const tile = this.pixelToTile(pt.x, pt.y);
		if (tile) {
			this.startStrokeAt(tile);
			this.setStrokePreview([tile]);
		}
	}

	private onTouchMove(ev: TouchEvent) {
		if (!this.target) return;

		// If not painting, don't consume; let Touch.ts handle panning/pinching
		if (!this.enablePainting || this.activeTouchId == null) return;

		const pt = this.touchToCanvasPx(this.target, ev, this.activeTouchId);
		if (!pt) return;

		// We are actively painting; prevent scrolling/defaults
		ev.preventDefault();

		this.x = pt.x;
		this.y = pt.y;

		if (this.isPainting) {
			const tile = this.pixelToTile(pt.x, pt.y);
			if (tile) this.extendStrokeTo(tile, this.paintConstraint);
		}
	}

	private onTouchEnd(ev: TouchEvent) {
		if (!this.enablePainting) return;

		const ended = Array.from(ev.changedTouches).some(
			(t) => t.identifier === this.activeTouchId,
		);
		if (!ended) return;

		// We owned this gesture; prevent default to avoid synthetic clicks, etc.
		ev.preventDefault();

		if (this.isPainting) {
			this.endStroke();
			this.eventEmitter.emit("clickBatch", this.strokeTiles);
		}

		this.activeTouchId = null;
	}

	private onTouchCancel(ev: TouchEvent) {
		if (!this.enablePainting) return;

		const cancelled = Array.from(ev.changedTouches).some(
			(t) => t.identifier === this.activeTouchId,
		);
		if (!cancelled) return;

		if (this.isPainting) this.endStroke();
		this.activeTouchId = null;
	}

	// ---------- Pixel → tile ----------

	private pixelToTile(px: number, py: number): [number, number] | null {
		if (!this.camera || !this.gameMap || !this.target) return null;

		const metrics: GridMetrics | undefined = (this.gameMap as any)._metrics;
		const bounds = (this.gameMap as any)._bounds;
		if (!metrics || !bounds) return null;

		const tf = getViewTransform({
			targetW: this.target.width,
			targetH: this.target.height,
			bgW: this.gameMap.background.width,
			bgH: this.gameMap.background.height,
			zoom: this.camera.zoomLevel,
			panX: this.camera.panX,
			panY: this.camera.panY,
		});

		return pickTileAtScreenPoint(px, py, metrics, bounds, tf);
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

		// Mouse
		this.target.addEventListener("mousemove", this.onMouseMove);
		this.target.addEventListener("click", this.onClick);
		this.target.addEventListener("mousedown", this.onMouseDown, true);
		this.target.addEventListener("mouseup", this.onMouseUp, true);
		this.target.addEventListener("mouseleave", this.onMouseLeave, true);

		// Touch
		this.target.addEventListener(
			"touchstart",
			this.onTouchStart,
			this.touchListenerOpts,
		);
		this.target.addEventListener(
			"touchmove",
			this.onTouchMove,
			this.touchListenerOpts,
		);
		this.target.addEventListener(
			"touchend",
			this.onTouchEnd,
			this.touchListenerOpts,
		);
		this.target.addEventListener(
			"touchcancel",
			this.onTouchCancel,
			this.touchListenerOpts,
		);

		// Prevent browser gestures on the canvas area
		this.target.style.touchAction = "none";
	}

	detach() {
		// Mouse
		this.target?.removeEventListener("mousemove", this.onMouseMove);
		this.target?.removeEventListener("click", this.onClick);
		this.target?.removeEventListener("mousedown", this.onMouseDown, true);
		this.target?.removeEventListener("mouseup", this.onMouseUp, true);
		this.target?.removeEventListener("mouseleave", this.onMouseLeave, true);

		// Touch
		if (this.target) {
			this.target.removeEventListener(
				"touchstart",
				this.onTouchStart,
				this.touchListenerOpts,
			);
			this.target.removeEventListener(
				"touchmove",
				this.onTouchMove,
				this.touchListenerOpts,
			);
			this.target.removeEventListener(
				"touchend",
				this.onTouchEnd,
				this.touchListenerOpts,
			);
			this.target.removeEventListener(
				"touchcancel",
				this.onTouchCancel,
				this.touchListenerOpts,
			);
		}
	}
}

export default Cursor;
