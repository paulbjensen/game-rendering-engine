class Cursor {

    x: number;
    y: number;
    target?: HTMLCanvasElement | null;

    constructor ({target}: {target?: HTMLCanvasElement | null}) {
        this.x = 0;
        this.y = 0;
        if (target) this.target = target;
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    onMouseMove(event: MouseEvent) {
        if (!this.target) return;
        const rect = this.target.getBoundingClientRect();
        this.x = event.clientX - rect.left;
        this.y = event.clientY - rect.top;
        // console.log(`Cursor position: (${this.x}, ${this.y})`);
        // We want to have a way to pass this value to the map and say (what's here?, so that we can interact with it)
        // Thing is, we also need to take into account the current zoom level and pan position as well, as they will affect
        // what is being hovered over
    }

    attach(target: HTMLCanvasElement) {
        this.target = target;
        this.target.addEventListener("mousemove", this.onMouseMove);
    }

    detach() {
        this.target?.removeEventListener("mousemove", this.onMouseMove);
    }

}

export default Cursor;