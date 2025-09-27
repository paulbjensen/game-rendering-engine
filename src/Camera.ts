import type EventEmitter from "@anephenix/event-emitter";
import type { Direction } from "./types";

class Camera {
	zoomLevel: number;
	panX: number;
	panY: number;
	activePanningDirections: Direction[];
	panningInterval: ReturnType<typeof setInterval> | null;
	eventEmitter: InstanceType<typeof EventEmitter>;
	maxZoomLevel: number | null;
	minZoomLevel: number | null;
	private _zoomRaf?: number;
	private _panRaf?: number;

	constructor({
		eventEmitter,
		minZoomLevel,
		maxZoomLevel,
	}: {
		eventEmitter: InstanceType<typeof EventEmitter>;
		minZoomLevel?: number;
		maxZoomLevel?: number;
	}) {
		this.eventEmitter = eventEmitter;
		this.zoomLevel = 1;
		this.maxZoomLevel = maxZoomLevel || null;
		this.minZoomLevel = minZoomLevel || null;
		this.panX = 0;
		this.panY = 0;
		/* Used to track if we are panning */
		this.panningInterval = null;
		/*
            Used to track the directions in which the camera will pan.

            We need to track multiple direction in case the user wants
            to pan diagonally by holding down two arrow keys at once.
        */
		this.activePanningDirections = [];
		this.startPanning = this.startPanning.bind(this);
		this.stopPanning = this.stopPanning.bind(this);
		this.zoomIn = this.zoomIn.bind(this);
		this.zoomOut = this.zoomOut.bind(this);
		this.resetZoom = this.resetZoom.bind(this);
		this.resetPan = this.resetPan.bind(this);
		this.resetPanWithSmoothing = this.resetPanWithSmoothing.bind(this);
		this.resetZoomWithSmoothing = this.resetZoomWithSmoothing.bind(this);
		this.addPan = this.addPan.bind(this);
		this.setZoom = this.setZoom.bind(this);
		this.applyPanning = this.applyPanning.bind(this);
	}

	/*
        Sets the zoom level to the specified value.

        @param level The new zoom level.
    */
	setZoom(level: number) {
		if (this.minZoomLevel !== null && level < this.minZoomLevel) {
			level = this.minZoomLevel;
		}
		if (this.maxZoomLevel !== null && level > this.maxZoomLevel) {
			level = this.maxZoomLevel;
		}
		const zoomFactor = level / this.zoomLevel;
		this.panX *= zoomFactor;
		this.panY *= zoomFactor;

		this.zoomLevel = level;
		this.eventEmitter.emit("cameraUpdated", {
			panX: this.panX,
			panY: this.panY,
			zoomLevel: this.zoomLevel,
		});
	}

	zoomIn() {
		this.setZoom(this.zoomLevel * 1.1);
	}

	zoomOut() {
		this.setZoom(this.zoomLevel / 1.1);
	}

	/*
        Adds the specified amount to the camera's pan offsets.

        @param dx The amount to pan in the x direction.
        @param dy The amount to pan in the y direction.

        NOTE - I named this add as it is not a setter operation
        in the traditional sense. It adds to the existing value 
        rather than replacing it completely.

    */
	addPan(dx: number, dy: number) {
		this.panX += dx;
		this.panY += dy;
		this.eventEmitter.emit("cameraUpdated", {
			panX: this.panX,
			panY: this.panY,
			zoomLevel: this.zoomLevel,
		});
	}

	/*
        Resets both the zoom level and pan offsets to their default values.
    */
	reset() {
		this.zoomLevel = 1;
		this.panX = 0;
		this.panY = 0;
	}

	/*
        Resets the camera's zoom level to the default value.
    */
	resetZoom() {
		const level = 1;
		const zoomFactor = level / this.zoomLevel;
		this.panX *= zoomFactor;
		this.panY *= zoomFactor;

		this.zoomLevel = 1;
		this.eventEmitter.emit("cameraUpdated", {
			panX: this.panX,
			panY: this.panY,
			zoomLevel: this.zoomLevel,
		});
	}

	resetZoomWithSmoothing(opts?: { duration?: number; targetZoom?: number }) {
		const duration = opts?.duration ?? 500; // ms
		const targetZoom = opts?.targetZoom ?? 1;

		const startZoom = this.zoomLevel;
		const startX = this.panX;
		const startY = this.panY;

		// Nothing to do
		if (
			!Number.isFinite(startZoom) ||
			startZoom <= 0 ||
			startZoom === targetZoom
		) {
			this.zoomLevel = targetZoom;
			// keep center locked by scaling pan to the final zoom
			const scale = targetZoom / (startZoom || 1);
			this.panX = startX * scale;
			this.panY = startY * scale;
			this.eventEmitter.emit("cameraUpdated", {
				panX: this.panX,
				panY: this.panY,
				zoomLevel: this.zoomLevel,
			});
			return;
		}

		// Cancel any in-flight animation
		if (this._zoomRaf) cancelAnimationFrame(this._zoomRaf);

		const startTime = performance.now();

		// Ease-out cubic: 1 - (1 - t)^3  (smooth start, gentle finish)
		const easeOut = (t: number) => 1 - (1 - t) ** 3;

		const tick = (now: number) => {
			const t = Math.min(1, (now - startTime) / duration);
			const k = easeOut(t); // 0..1

			// Interpolate zoom
			const z = startZoom + (targetZoom - startZoom) * k;

			// Keep camera center fixed: pan scales proportionally with zoom
			const scale = z / startZoom;
			this.zoomLevel = z;
			this.panX = startX * scale;
			this.panY = startY * scale;

			this.eventEmitter.emit("cameraUpdated", {
				panX: this.panX,
				panY: this.panY,
				zoomLevel: this.zoomLevel,
			});

			if (t < 1) {
				this._zoomRaf = requestAnimationFrame(tick);
			} else {
				// Snap to exact target at the end
				this.zoomLevel = targetZoom;
				const finalScale = targetZoom / startZoom;
				this.panX = startX * finalScale;
				this.panY = startY * finalScale;

				this.eventEmitter.emit("cameraUpdated", {
					panX: this.panX,
					panY: this.panY,
					zoomLevel: this.zoomLevel,
				});

				this._zoomRaf = undefined;
			}
		};

		this._zoomRaf = requestAnimationFrame(tick);
	}

	/*
        Resets the camera's pan offsets to zero.
    */
	resetPan() {
		this.panX = 0;
		this.panY = 0;
		this.eventEmitter.emit("cameraUpdated", {
			panX: this.panX,
			panY: this.panY,
			zoomLevel: this.zoomLevel,
		});
	}

	resetPanWithSmoothing(opts?: { duration?: number }) {
		const duration = opts?.duration ?? 500; // ms
		const startX = this.panX;
		const startY = this.panY;

		if (startX === 0 && startY === 0) return;

		// Cancel any in-flight pan animation
		if (this._panRaf) cancelAnimationFrame(this._panRaf);

		const startTime = performance.now();

		// Ease-out cubic (same as resetZoomWithSmoothing)
		const easeOut = (t: number) => 1 - (1 - t) ** 1.5;

		const tick = (now: number) => {
			const t = Math.min(1, (now - startTime) / duration);
			const k = easeOut(t); // 0 → 1

			this.panX = startX * (1 - k);
			this.panY = startY * (1 - k);

			this.eventEmitter.emit("cameraUpdated", {
				panX: this.panX,
				panY: this.panY,
				zoomLevel: this.zoomLevel,
			});

			if (t < 1) {
				this._panRaf = requestAnimationFrame(tick);
			} else {
				// Snap exactly to 0 at the end
				this.panX = 0;
				this.panY = 0;
				this.eventEmitter.emit("cameraUpdated", {
					panX: this.panX,
					panY: this.panY,
					zoomLevel: this.zoomLevel,
				});
				this._panRaf = undefined;
			}
		};

		this._panRaf = requestAnimationFrame(tick);
	}

	/*
		Applies panning based on the currently active panning directions.
	*/
	applyPanning() {
		const panSpeed = 10; // Adjust the panning speed as needed

		for (const dir of this.activePanningDirections) {
			if (dir === "left") {
				this.panX += panSpeed;
			} else if (dir === "right") {
				this.panX -= panSpeed;
			} else if (dir === "up") {
				// We move 1/2 the speed in the y direction because
				// then when we do diagonal scrolling, it matches the
				// isometric tile ratio better.
				this.panY += panSpeed / 2;
			} else if (dir === "down") {
				this.panY -= panSpeed / 2;
			}
		}
		this.eventEmitter.emit("cameraUpdated", {
			panX: this.panX,
			panY: this.panY,
			zoomLevel: this.zoomLevel,
		});
	}

	/*
	 * Start panning in a specific direction
	 * @param {string} direction - The direction to pan ('left', 'right', 'up', 'down')
	 * This function starts an interval that pans the map in the specified direction.
	 * If the interval is already running, it will not start a new one.
	 *
	 * // TODO - implement use of requestAnimationFrame instead of setInterval
	 */
	startPanning(direction: Direction) {
		// Don't trigger if already panning in that direction
		if (this.activePanningDirections.includes(direction)) return;
		// Add the direction to the list of active directions
		this.activePanningDirections.push(direction);

		if (!this.panningInterval) {
			this.panningInterval = setInterval(this.applyPanning, 1000 / 60);
		}
	}

	/* Stop panning in a specific direction
	 * @param {string} direction - The direction to stop panning ('left', 'right', 'up', 'down')
	 * This function stops the panning interval for the specified direction.
	 */
	stopPanning(direction: Direction) {
		const index = this.activePanningDirections.indexOf(direction);
		if (index !== -1) {
			this.activePanningDirections.splice(index, 1);
		}
		if (this.activePanningDirections.length === 0) {
			if (this.panningInterval) clearInterval(this.panningInterval);
			this.panningInterval = null;
		}
	}
}

export default Camera;
