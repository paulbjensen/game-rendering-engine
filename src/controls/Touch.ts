import type EventEmitter from "@anephenix/event-emitter";

/*
  This class handles touch panning (1 finger) and pinch zoom (2 fingers).
  It exposes enable flags so App mode can arbitrate gestures with Cursor.
*/
class Touch {
	lastTouchX: number = 0;
	lastTouchY: number = 0;
	lastTouchDistance: number = 0;
	isTouchPanning: boolean = false;
	target?: HTMLElement;
	eventEmitter: InstanceType<typeof EventEmitter>;

	// NEW: enable flags
	panningEnabled = true;
	pinchEnabled = true;

	constructor({
		target,
		eventEmitter,
	}: {
		target?: HTMLElement;
		eventEmitter: InstanceType<typeof EventEmitter>;
	}) {
		if (target) this.target = target;
		this.eventEmitter = eventEmitter;
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
	}

	setEnabled({ panning, pinch }: { panning?: boolean; pinch?: boolean }) {
		if (typeof panning === "boolean") this.panningEnabled = panning;
		if (typeof pinch === "boolean") this.pinchEnabled = pinch;
	}

	attach(target: HTMLElement) {
		if (target) this.target = target;
		this.target?.addEventListener("touchstart", this.onTouchStart, {
			passive: false,
		});
		this.target?.addEventListener("touchmove", this.onTouchMove, {
			passive: false,
		});
		this.target?.addEventListener("touchend", this.onTouchEnd, {
			passive: false,
		});

		// App can also set: (this.target as HTMLElement).style.touchAction = "none";
	}

	detach() {
		this.target?.removeEventListener("touchstart", this.onTouchStart);
		this.target?.removeEventListener("touchmove", this.onTouchMove);
		this.target?.removeEventListener("touchend", this.onTouchEnd);
	}

	onTouchStart(e: TouchEvent) {
		if (!this.target) return;

		if (e.touches.length === 1) {
			// Single finger: start panning if enabled
			if (!this.panningEnabled) return;

			this.isTouchPanning = true;
			const rect = this.target.getBoundingClientRect();
			this.lastTouchX = e.touches[0].clientX - rect.left;
			this.lastTouchY = e.touches[0].clientY - rect.top;
			// We don't call preventDefault yet; TouchMove will do it only if we handle movement
		} else if (e.touches.length === 2) {
			// Two fingers: start zooming if enabled
			if (!this.pinchEnabled) return;

			this.isTouchPanning = false;
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			this.lastTouchDistance = Math.hypot(dx, dy);
		}
	}

	onTouchMove(e: TouchEvent) {
		if (!this.target) return;

		const rect = this.target.getBoundingClientRect();

		if (e.touches.length === 1 && this.panningEnabled && this.isTouchPanning) {
			// We are actively panning -> consume gesture
			e.preventDefault();

			const touchX = e.touches[0].clientX - rect.left;
			const touchY = e.touches[0].clientY - rect.top;
			const dx = touchX - this.lastTouchX;
			const dy = touchY - this.lastTouchY;

			this.eventEmitter.emit("pan", dx, dy);

			this.lastTouchX = touchX;
			this.lastTouchY = touchY;
		} else if (e.touches.length === 2 && this.pinchEnabled) {
			// Pinch zoom -> consume gesture
			e.preventDefault();

			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const distance = Math.hypot(dx, dy);

			if (this.lastTouchDistance) {
				const zoomFactor = distance / this.lastTouchDistance;
				this.eventEmitter.emit("adjustZoom", zoomFactor);
			}
			this.lastTouchDistance = distance;
		} else {
			// Not handling this move; don't preventDefault so others can handle it.
		}
	}

	onTouchEnd(e: TouchEvent) {
		if (e.touches.length === 0) {
			this.isTouchPanning = false;
			this.lastTouchDistance = 0;
		}
	}
}

export default Touch;
