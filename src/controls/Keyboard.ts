export interface KeyboardOptions {
	keydown: { [key: string]: () => void };
	keyup: { [key: string]: () => void };
}

class Keyboard {
	options: KeyboardOptions;
	/*
        Note - I'm using the keyboard's key rather than keyCode for the bindings,
        which is an implicit rule and currently there is no way to bind it on the 
        keyCode, but let's cross that bridge when we get to it.
    */

	/* binds the options for use in other function calls */
	constructor(options: KeyboardOptions) {
		this.options = options;
	}

	/*
        Attaches the keyboard event listeners.
    */
	attach() {
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
	}

	/*
        Detaches the keyboard event listeners.

        This is useful for whn you unmount a component, 
        or when you need to disable keboard bindings because you've
        switched to a different screen in an app or a mode.
    */
	detach() {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
	}

	private handleKeyDown = (event: KeyboardEvent) => {
		const action = this.options.keydown[event.key];
		if (action) action();
	};

	private handleKeyUp = (event: KeyboardEvent) => {
		const action = this.options.keyup[event.key];
		if (action) action();
	};
}

export default Keyboard;
