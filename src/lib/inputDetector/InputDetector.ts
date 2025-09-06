type InputCapabilities = {
	anyFinePointer: boolean; // e.g., mouse/trackpad/stylus
	anyHover: boolean; // true if something can hover
	hasTouch: boolean; // touch available
	lastPointerType: "mouse" | "pen" | "touch" | "unknown";
};

export class InputDetector {
	caps: InputCapabilities = {
		anyFinePointer: false,
		anyHover: false,
		hasTouch: false,
		lastPointerType: "unknown",
	};

	private mqFine = window.matchMedia("(any-pointer: fine)");
	private mqHover = window.matchMedia("(any-hover: hover)");
	private onMQFine = () => this.refresh();
	private onMQHover = () => this.refresh();

	constructor() {
		this.refresh();

		// react to capability changes (e.g., mouse plugged in)
		this.mqFine.addEventListener("change", this.onMQFine);
		this.mqHover.addEventListener("change", this.onMQHover);

		// learn from real events (robust on weird platforms)
		window.addEventListener("pointerdown", this.onPointer, { passive: true });
		window.addEventListener("pointermove", this.onPointer, { passive: true });
	}

	destroy() {
		this.mqFine.removeEventListener("change", this.onMQFine);
		this.mqHover.removeEventListener("change", this.onMQHover);
		window.removeEventListener("pointerdown", this.onPointer);
		window.removeEventListener("pointermove", this.onPointer);
	}

	private refresh() {
		this.caps.anyFinePointer = this.mqFine.matches;
		this.caps.anyHover = this.mqHover.matches;
		this.caps.hasTouch = (navigator.maxTouchPoints || 0) > 0;
	}

	private onPointer = (ev: PointerEvent) => {
		// Ignore legacy mouse compatibility events by preferring Pointer Events
		if (
			ev.pointerType === "mouse" ||
			ev.pointerType === "pen" ||
			ev.pointerType === "touch"
		) {
			this.caps.lastPointerType = ev.pointerType;
		}
	};

	/** Show mouse-style selector iff something can hover AND is fine pointer,
	 *  or we've recently seen a real mouse.
	 */
	shouldShowMouseSelector(): boolean {
		return (
			(this.caps.anyHover && this.caps.anyFinePointer) ||
			this.caps.lastPointerType === "mouse"
		);
	}
}
