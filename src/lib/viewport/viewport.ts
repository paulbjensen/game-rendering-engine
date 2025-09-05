// src/viewport.ts

export type RC = [row: number, col: number];

export interface GridMetrics {
	W: number; // base tile width  (e.g. 64)
	H: number; // base tile height (e.g. 32)
	Wmax?: number; // widest sprite width seen (defaults to W)
	Hmax?: number; // tallest sprite height seen (defaults to H)
	rows: number;
	cols: number;
}

export interface MapBounds {
	bgW: number; // background canvas width (world px)
	bgH: number; // background canvas height (world px)
	mapX: number; // world origin X for top-left tile footprint
	mapY: number; // world origin Y for top-left tile footprint
}

export interface ViewportInput {
	targetW: number; // target canvas backing width (px)
	targetH: number; // target canvas backing height (px)
	bgW: number; // background world width (px)
	bgH: number; // background world height (px)
	zoom: number; // camera.zoomLevel
	panX: number; // camera.panX (screen px)
	panY: number; // camera.panY (screen px)
}

export interface ViewTransform {
	zoom: number;
	e: number; // translation X (screen px)
	f: number; // translation Y (screen px)
}

/** Compute snug background size + world-map origin that avoids clipping. */
export function measureMapBounds(m: GridMetrics): MapBounds {
	const Wmax = Math.max(m.W, m.Wmax ?? m.W);
	const Hmax = Math.max(m.H, m.Hmax ?? m.H);

	const bgW = Math.ceil(((m.rows + m.cols) * m.W) / 2 + (Wmax - m.W));
	const bgH = Math.ceil(((m.rows + m.cols) * m.H) / 2 + (Hmax - m.H));

	// Center wide sprites horizontally; lift tall sprites vertically
	const mapX = ((m.rows - 1) * m.W) / 2 + (Wmax - m.W) / 2;
	const mapY = Hmax - m.H;

	return { bgW, bgH, mapX, mapY };
}

/** View transform used by both render and picking. Do NOT round e/f here. */
export function getViewTransform(v: ViewportInput): ViewTransform {
	const e = v.targetW / 2 + v.panX - (v.bgW * v.zoom) / 2;
	const f = v.targetH / 2 + v.panY - (v.bgH * v.zoom) / 2;
	return { zoom: v.zoom, e, f };
}

/** For pixel-art rendering only: snap translation for crisper edges. */
export function snapped(tf: ViewTransform): ViewTransform {
	return { zoom: tf.zoom, e: Math.round(tf.e), f: Math.round(tf.f) };
}

/** World → Screen */
export function worldToScreen(wx: number, wy: number, tf: ViewTransform) {
	return { x: wx * tf.zoom + tf.e, y: wy * tf.zoom + tf.f };
}

/** Screen → World (inverse of worldToScreen) */
export function screenToWorld(px: number, py: number, tf: ViewTransform) {
	return { wx: (px - tf.e) / tf.zoom, wy: (py - tf.f) / tf.zoom };
}

/** Base-grid top-left of a tile footprint (ignores sprite overhang). */
export function rcToWorldTopLeft(
	r: number,
	c: number,
	m: GridMetrics,
	b: MapBounds,
) {
	const wx = ((c - r) * m.W) / 2 + b.mapX;
	const wy = ((c + r) * m.H) / 2 + b.mapY;
	return { wx, wy };
}

/** World position of the diamond center for base W×H footprint. */
export function rcToWorldCenter(
	r: number,
	c: number,
	m: GridMetrics,
	b: MapBounds,
) {
	const top = rcToWorldTopLeft(r, c, m, b);
	return { wx: top.wx + m.W / 2, wy: top.wy + m.H / 2 };
}

/** Continuous diamond coords (u≈col, v≈row) from world→map-local. */
export function worldToUV(
	wx: number,
	wy: number,
	m: GridMetrics,
	b: MapBounds,
) {
	const lx = wx - b.mapX;
	const ly = wy - b.mapY;
	const hw = m.W / 2,
		hh = m.H / 2;
	const u = (lx / hw + ly / hh) / 2;
	const v = (ly / hh - lx / hw) / 2;
	return { u, v };
}

/** Nearest-center rounding with tiny epsilon (avoids bottom-right bias). */
export function roundToRC(u: number, v: number): RC {
	const EPS = 1e-6;
	const col = Math.floor(u + 0.5 - EPS);
	const row = Math.floor(v + 0.5 - EPS);
	return [row, col];
}

/**
 * Robust picking: inverse-transform the cursor, estimate (row,col),
 * then search neighbors and choose the diamond-center closest to the cursor.
 */
export function pickTileAtScreenPoint(
	px: number,
	py: number,
	m: GridMetrics,
	b: MapBounds,
	tf: ViewTransform,
): RC | null {
	const { wx, wy } = screenToWorld(px, py, tf);
	const { u, v } = worldToUV(wx, wy, m, b);

	const [row0, col0] = roundToRC(u, v);
	const candidates: RC[] = [
		[row0, col0],
		[row0, col0 + 1],
		[row0 + 1, col0],
		[row0 - 1, col0],
		[row0, col0 - 1],
		[row0 + 1, col0 + 1],
		[row0 - 1, col0 - 1],
	];

	const halfW = (m.W * tf.zoom) / 2;
	const halfH = (m.H * tf.zoom) / 2;

	let best: RC | null = null;
	let bestScore = Number.POSITIVE_INFINITY;

	for (const [r, c] of candidates) {
		if (r < 0 || c < 0 || r >= m.rows || c >= m.cols) continue;
		const centerW = rcToWorldCenter(r, c, m, b);
		const centerS = worldToScreen(centerW.wx, centerW.wy, tf);
		const score =
			Math.abs(px - centerS.x) / halfW + Math.abs(py - centerS.y) / halfH; // L1 diamond metric

		if (score < bestScore) {
			bestScore = score;
			best = [r, c];
		}
	}
	return best;
}

/** Mouse CSS px → canvas backing px, robust to DPR & CSS scale. */
export function mouseToCanvasPx(canvas: HTMLCanvasElement, ev: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	const x = (ev.clientX - rect.left) * scaleX;
	const y = (ev.clientY - rect.top) * scaleY;
	return { x, y };
}
