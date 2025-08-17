class Camera {

    zoomLevel: number;
    panX: number;
    panY: number;

    constructor() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
    }

    /*
        Sets the zoom level to the specified value.

        @param level The new zoom level.
    */
    setZoom(level:number) {
        this.zoomLevel = level;
    }

    /*
        Adds the specified amount to the camera's pan offsets.

        @param dx The amount to pan in the x direction.
        @param dy The amount to pan in the y direction.

        NOTE - I named this add as it is not a setter operation
        in the traditional sense. It adds to the existing value 
        rather than replacing it completely.

    */
    addPan(dx:number, dy:number) {
        this.panX += dx;
        this.panY += dy;
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
        this.zoomLevel = 1;
    }

    /*
        Resets the camera's pan offsets to zero.
    */
    resetPan() {
        this.panX = 0;
        this.panY = 0;
    }
}

export default Camera;