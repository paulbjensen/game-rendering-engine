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

    constructor(options: KeyboardOptions) {
        this.options = options;
    }

    attach() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    detach() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
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