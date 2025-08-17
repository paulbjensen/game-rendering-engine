class Camera {

    zoomLevel: number;
    panX: number;
    panY: number;

    constructor() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
    }

    setZoom(level:number) {
        this.zoomLevel = level;
    }

    addPan(dx:number, dy:number) {
        this.panX += dx;
        this.panY += dy;
    }

    reset() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
    }

    resetZoom() {
        this.zoomLevel = 1;
    }

    resetPan() {
        this.panX = 0;
        this.panY = 0;
    }
}

export default Camera;