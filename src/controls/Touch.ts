import type EventEmitter from "@anephenix/event-emitter";

/*
    This class is used to help apply touch events to the canvas 
    for mobile and tablet devices.
*/
class Touch {
	lastTouchX: number = 0;
	lastTouchY: number = 0;
	lastTouchDistance: number = 0;
	isTouchPanning: boolean = false;
	target?: HTMLElement;
	eventEmitter: InstanceType<typeof EventEmitter>;

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
	}

	detach() {
		this.target?.removeEventListener("touchstart", this.onTouchStart);
		this.target?.removeEventListener("touchmove", this.onTouchMove);
		this.target?.removeEventListener("touchend", this.onTouchEnd);
	}

	onTouchStart(e: TouchEvent) {
		if (!this.target) return;
		if (e.touches.length === 1) {
			// Single finger: start panning
			this.isTouchPanning = true;
			const rect = this.target.getBoundingClientRect();
			this.lastTouchX = e.touches[0].clientX - rect.left;
			this.lastTouchY = e.touches[0].clientY - rect.top;
		} else if (e.touches.length === 2) {
			// Two fingers: start zooming
			this.isTouchPanning = false;
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
		}
	}

	onTouchMove(e: TouchEvent) {
		if (!this.target) return;
		e.preventDefault();
		const rect = this.target.getBoundingClientRect();
		if (e.touches.length === 1 && this.isTouchPanning) {
			// Panning
			const touchX = e.touches[0].clientX - rect.left;
			const touchY = e.touches[0].clientY - rect.top;
			const dx = touchX - this.lastTouchX;
			const dy = touchY - this.lastTouchY;
			this.eventEmitter.emit("pan", dx, dy);
			this.lastTouchX = touchX;
			this.lastTouchY = touchY;
		} else if (e.touches.length === 2) {
			// Pinch zoom
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (this.lastTouchDistance) {
				const zoomFactor = distance / this.lastTouchDistance;
				this.eventEmitter.emit("adjustZoom", zoomFactor);
			}
			this.lastTouchDistance = distance;
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
