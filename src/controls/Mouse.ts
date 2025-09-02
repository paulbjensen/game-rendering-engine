import type EventEmitter from "@anephenix/event-emitter";

interface MouseOptions {
	target?: HTMLElement | null;
	eventEmitter: InstanceType<typeof EventEmitter>;
	mousePanning?: boolean;
	momentum?: boolean;
}

/* 
    Thoughts

    This mouse class is very attached to navigating the map

    I wonder if it should be renamed, or abstracted in such a way that different behaviours can occur and this simply triggers them via events.
*/

class Mouse {
	target?: HTMLElement | null;
	eventEmitter: InstanceType<typeof EventEmitter>;
	isDragging: boolean = false;
	lastMouseX: number = 0;
	lastMouseY: number = 0;
	velocityX: number = 0;
	velocityY: number = 0;
	momentumAnimationFrame: number | null = null;
	suppressClick: boolean = false;
	dragThreshold: number = 5; // pixels
	dragDistance: number = 0;
	mousePanning: boolean = true;
	momentum: boolean = true;

	constructor({ target, eventEmitter }: MouseOptions) {
		if (target) this.target = target;
		this.eventEmitter = eventEmitter;
		this.onWheel = this.onWheel.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.adjustCameraPan = this.adjustCameraPan.bind(this);
	}

	attach(target: HTMLElement) {
		this.target = target;
		this.target?.addEventListener("wheel", this.onWheel, { passive: false });
		this.target?.addEventListener("mousedown", this.onMouseDown);
		this.target?.addEventListener("mousemove", this.onMouseMove);
		this.target?.addEventListener("mouseup", this.onMouseUp);
		this.target?.addEventListener("mouseleave", this.onMouseLeave);
	}

	detach() {
		this.target?.removeEventListener("wheel", this.onWheel);
		this.target?.removeEventListener("mousedown", this.onMouseDown);
		this.target?.removeEventListener("mousemove", this.onMouseMove);
		this.target?.removeEventListener("mouseup", this.onMouseUp);
		this.target?.removeEventListener("mouseleave", this.onMouseLeave);
	}

	onWheel(event: WheelEvent) {
		event.preventDefault();
		const action = event.deltaY < 0 ? "zoomOut" : "zoomIn";
		this.eventEmitter.emit(action);
	}

	/* This is used to intercept the mousedown event for when dragging starts */
	onMouseDown(event: MouseEvent) {
		if (!this.mousePanning) return;
		this.suppressClick = false;
		this.isDragging = true;
		const rect = this.target?.getBoundingClientRect();
		if (!rect) return;
		this.lastMouseX = event.clientX - rect.left;
		this.lastMouseY = event.clientY - rect.top;
		this.velocityX = 0;
		this.velocityY = 0;
		this.dragDistance = 0;
		if (this.momentumAnimationFrame) {
			cancelAnimationFrame(this.momentumAnimationFrame);
			this.momentumAnimationFrame = null;
		}
	}

	adjustCameraPan(event: MouseEvent) {
		if (!this.isDragging) return;
		const rect = this.target?.getBoundingClientRect();
		if (!rect) return;
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		const dx = mouseX - this.lastMouseX;
		const dy = mouseY - this.lastMouseY;
		// This is the eventEmitter event that triggers panning and zooming
		// Perhaps this is the bit that needs to be abstracted out
		this.eventEmitter.emit("pan", dx, dy);
		this.velocityX = dx;
		this.velocityY = dy;
		this.lastMouseX = mouseX;
		this.lastMouseY = mouseY;
		this.dragDistance += Math.sqrt(dx * dx + dy * dy);
		if (this.dragDistance > this.dragThreshold) {
			this.suppressClick = true;
		}
	}

	onMouseMove(event: MouseEvent) {
		if (!this.mousePanning) return;
		this.adjustCameraPan(event);
	}

	/*
        Stop tracking mouse movement when dragging ends, but still apply a nice
        velocity effect on the map, so that it continues to move.
    */
	onMouseUp() {
		if (!this.mousePanning) return;
		if (!this.momentum) return;
		this.isDragging = false;
		const friction = 0.95;
		const applyMomentum = () => {
			this.velocityX *= friction;
			this.velocityY *= friction;
			this.eventEmitter.emit("pan", this.velocityX, this.velocityY);
			if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
				requestAnimationFrame(applyMomentum);
			}
		};
		if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
			applyMomentum();
		}
	}

	/*
        This is used to intercept the mouseleave event for when dragging ends.

        Curious to find out the need for this on both the mouseup and 
        mouseleave events.
    */
	onMouseLeave() {
		if (!this.mousePanning) return;
		this.isDragging = false;
	}
}

export default Mouse;
