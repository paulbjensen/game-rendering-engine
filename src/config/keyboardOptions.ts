import type { KeyboardOptions } from "../controls/keyboard/Keyboard";
import eventEmitter from "../eventEmitter";

/*
	This is where we add keybindings for the keyboard to use.

	In this case we're triggering events using the eventEmitter instance,
	so we include it as a dependency.
*/
const keyboardOptions: KeyboardOptions = {
	keydown: {
		ArrowUp: () => eventEmitter.emit("startPanning", "up"),
		ArrowDown: () => eventEmitter.emit("startPanning", "down"),
		ArrowLeft: () => eventEmitter.emit("startPanning", "left"),
		ArrowRight: () => eventEmitter.emit("startPanning", "right"),
		"=": () => eventEmitter.emit("zoomIn"),
		"-": () => eventEmitter.emit("zoomOut"),
		"0": () => eventEmitter.emit("resetZoom"),
		c: () => eventEmitter.emit("recenter"),
		d: () => eventEmitter.emit("toggleFPSCounter"),
	},
	keyup: {
		ArrowUp: () => eventEmitter.emit("stopPanning", "up"),
		ArrowDown: () => eventEmitter.emit("stopPanning", "down"),
		ArrowLeft: () => eventEmitter.emit("stopPanning", "left"),
		ArrowRight: () => eventEmitter.emit("stopPanning", "right"),
	},
};

export default keyboardOptions;
