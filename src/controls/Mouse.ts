import type EventEmitter from '@anephenix/event-emitter';

interface MouseOptions {
    target?: HTMLElement | null;
    eventEmitter: InstanceType<typeof EventEmitter>;
}

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

    constructor({target, eventEmitter}: MouseOptions) {
        if (target) this.target = target;
        this.eventEmitter = eventEmitter;
        this.onWheel = this.onWheel.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.adjustCameraPan = this.adjustCameraPan.bind(this);
        // this.drawCursor = this.drawCursor.bind(this);
    }

    attach(target: HTMLElement) {
        this.target = target;
        this.target?.addEventListener('wheel', this.onWheel, { passive: false });
        this.target?.addEventListener('mousedown', this.onMouseDown);
        this.target?.addEventListener('mousemove', this.onMouseMove);
        this.target?.addEventListener('mouseup', this.onMouseUp);
        this.target?.addEventListener('mouseleave', this.onMouseLeave);
    }

    detach() {
        this.target?.removeEventListener('wheel', this.onWheel);
        this.target?.removeEventListener('mousedown', this.onMouseDown);
        this.target?.removeEventListener('mousemove', this.onMouseMove);
        this.target?.removeEventListener('mouseup', this.onMouseUp);
        this.target?.removeEventListener('mouseleave', this.onMouseLeave);
    }

    onWheel (event: WheelEvent) {
        event.preventDefault();
        const action = event.deltaY < 0 ? 'zoomOut' : 'zoomIn';
        this.eventEmitter.emit(action);
    }

    /* This is used to intercept the mousedown event for when dragging starts */
    onMouseDown (event: MouseEvent) {
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

    adjustCameraPan (event: MouseEvent) {
        if (!this.isDragging) return;
        const rect = this.target?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const dx = mouseX - this.lastMouseX;
        const dy = mouseY - this.lastMouseY;
        this.eventEmitter.emit('pan', dx, dy);
        this.velocityX = dx;
        this.velocityY = dy;
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
        this.dragDistance += Math.sqrt(dx * dx + dy * dy);
        if (this.dragDistance > this.dragThreshold) {
            this.suppressClick = true;
        }
        // drawMap was called here - but in theory the eventEmitter pan event will trigger that  
    }

    /* 
        === NOTE === 
        
        The cursor needs to know about the map - so this may need to be setup differently.

        Perhaps it emits an event with the mouse's current cursor position, and another
        class handles drawing the cursor on the screen, in a different canvas that 
        sits above the map canvas.
    */

    // drawCursor(event: MouseEvent) {
        //     if (suppressClick) {
        //         suppressClick = false;
        //         return;
        //     }

        //     // Get canvas bounding rect and mouse position relative to canvas
        //     const rect = canvas.getBoundingClientRect();
        //     const mouseX = (e.clientX - rect.left);
        //     const mouseY = (e.clientY - rect.top);

        //     // Calculate map offset as in drawMap
        //     const offsetX = mapRows * (BASE_TILE_WIDTH / 2) * camera.zoomLevel - (BASE_TILE_WIDTH / 2) * camera.zoomLevel;
        //     // const offsetY = mapColumns * (BASE_TILE_HEIGHT / 2) * camera.zoomLevel - (BASE_TILE_HEIGHT / 2) * camera.zoomLevel;
        //     const mapRowsPixels = mapRows * BASE_TILE_WIDTH * camera.zoomLevel;
        //     const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT * camera.zoomLevel;
        //     const centerX = canvas.width / 2 + offsetX;
        //     const centerY = canvas.height / 2;
        //     const mapX = centerX - mapRowsPixels / 2 + camera.panX;
        //     const mapY = centerY - mapColumnsPixels / 2 + camera.panY;
        //     // console.log({ offsetX, offsetY, mapRowsPixels, mapColumnsPixels, centerX, centerY, mapX, mapY});

        //     // Convert mouse position to map coordinates
        //     const relX = mouseX - mapX;
        //     const relY = mouseY - mapY; // Hmm, this value seems to adjust with scale 

        //     // Inverse isometric transform
        //     const tileW = BASE_TILE_WIDTH * camera.zoomLevel;
        //     const tileH = BASE_TILE_HEIGHT * camera.zoomLevel;
        //     const col = Math.floor((relX / (tileW / 2) + relY / (tileH / 2)) / 2);
        //     const row = Math.floor((relY / (tileH / 2) - relX / (tileW / 2)) / 2);

        //     // Clamp to map bounds
        //     // if (col < 0 || col >= mapRows || row < 0 || row >= mapColumns) {
        //     //     console.log('Clicked outside map');
        //     //     return;
        //     // }

        //     // Almost perfect detects the tile clicked on, but we need to adjust for the isometric projection
        //     // map[row][col] = 3;
        //     drawMap();

        //     // TODO - have this draw in a 2nd layer above the main canvas

        //     // 1 - canvas for the map
        //     // 2 - for the mouse selection/hover/overlay 

        //     const ctx = canvas.getContext('2d');
        //     if (ctx) {
        //         // let region = new Path2D();
        //         // region.rect(0, 0, canvas.width, canvas.height);
        //         // ctx.clip(region);

        //         // ctx.save();
        //         // ctx.font = '16px Arial';
        //         // ctx.fillStyle = 'yellow';
        //         // ctx.strokeStyle = 'black';
        //         // ctx.lineWidth = 2;
        //         // const text = `relX: ${relX.toFixed(1)}, relY: ${relY.toFixed(1)}, col: ${col}, row: ${row}`;
        //         // const textX = mouseX + 10;
        //         // const textY = mouseY + 100;
        //         // ctx.strokeText(text, textX, textY);
        //         // ctx.fillText(text, textX, textY);
        //         // ctx.restore();

        //         ctx.save();
        //         ctx.strokeStyle = 'white';
        //         ctx.lineWidth = 2;
        //         // Calculate the top-left corner of the tile in screen coordinates
        //         const tile = tilesLibrary.find(t => t.code === map[row][col]);
        //         const tileWidth = 64 * camera.zoomLevel;
        //         const tileHeight = 32 * camera.zoomLevel;
        //         const x = (col - row) * tileWidth / 2 + mapX;
        //         const y = (col + row) * tileHeight / 2 + mapY - ((tile?.height ? tile.height : BASE_TILE_HEIGHT) - BASE_TILE_HEIGHT) * camera.zoomLevel;

        //         // Draw diamond
        //         ctx.beginPath();
        //         ctx.moveTo(x + tileWidth / 2, y); // top
        //         ctx.lineTo(x + tileWidth, y + tileHeight / 2); // right
        //         ctx.lineTo(x + tileWidth / 2, y + tileHeight); // bottom
        //         ctx.lineTo(x, y + tileHeight / 2); // left
        //         ctx.closePath();
        //         ctx.stroke();
        //         ctx.restore();

        //         // Draw square of detected tile
        //         ctx.save();
        //         ctx.strokeStyle = 'red';
        //         ctx.lineWidth = 2;
        //         ctx.strokeRect(x, y, tileWidth, tileHeight);
        //         ctx.restore();
        //     }

        //     // console.log(`Clicked map row: ${row}, column: ${col}`);        
    // }


    onMouseMove (event: MouseEvent) {
        this.adjustCameraPan(event);
        // this.drawCursor(event);
    }

    /*
        Stop tracking mouse movement when dragging ends, but still apply a nice
        velocity effect on the map, so that it continues to move.
    */
    onMouseUp () {
        this.isDragging = false;
        const friction = 0.95;
        const applyMomentum = () => {
            this.velocityX *= friction;
            this.velocityY *= friction;
            this.eventEmitter.emit('pan', this.velocityX, this.velocityY);
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
    onMouseLeave () {
        this.isDragging = false;
    }


}

export default Mouse;

// Unsorted code



        // // NOTE - clicks are not triggering, but we do have mouse dragging to move around the canvas at the moment
        // canvas.addEventListener('mousemove', (e) => {
        //     if (suppressClick) {
        //         suppressClick = false;
        //         return;
        //     }

        //     // Get canvas bounding rect and mouse position relative to canvas
        //     const rect = canvas.getBoundingClientRect();
        //     const mouseX = (e.clientX - rect.left);
        //     const mouseY = (e.clientY - rect.top);

        //     // Calculate map offset as in drawMap
        //     const offsetX = mapRows * (BASE_TILE_WIDTH / 2) * camera.zoomLevel - (BASE_TILE_WIDTH / 2) * camera.zoomLevel;
        //     // const offsetY = mapColumns * (BASE_TILE_HEIGHT / 2) * camera.zoomLevel - (BASE_TILE_HEIGHT / 2) * camera.zoomLevel;
        //     const mapRowsPixels = mapRows * BASE_TILE_WIDTH * camera.zoomLevel;
        //     const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT * camera.zoomLevel;
        //     const centerX = canvas.width / 2 + offsetX;
        //     const centerY = canvas.height / 2;
        //     const mapX = centerX - mapRowsPixels / 2 + camera.panX;
        //     const mapY = centerY - mapColumnsPixels / 2 + camera.panY;
        //     // console.log({ offsetX, offsetY, mapRowsPixels, mapColumnsPixels, centerX, centerY, mapX, mapY});

        //     // Convert mouse position to map coordinates
        //     const relX = mouseX - mapX;
        //     const relY = mouseY - mapY; // Hmm, this value seems to adjust with scale 

        //     // Inverse isometric transform
        //     const tileW = BASE_TILE_WIDTH * camera.zoomLevel;
        //     const tileH = BASE_TILE_HEIGHT * camera.zoomLevel;
        //     const col = Math.floor((relX / (tileW / 2) + relY / (tileH / 2)) / 2);
        //     const row = Math.floor((relY / (tileH / 2) - relX / (tileW / 2)) / 2);

        //     // Clamp to map bounds
        //     // if (col < 0 || col >= mapRows || row < 0 || row >= mapColumns) {
        //     //     console.log('Clicked outside map');
        //     //     return;
        //     // }

        //     // Almost perfect detects the tile clicked on, but we need to adjust for the isometric projection
        //     // map[row][col] = 3;
        //     drawMap();

        //     // TODO - have this draw in a 2nd layer above the main canvas

        //     // 1 - canvas for the map
        //     // 2 - for the mouse selection/hover/overlay 

        //     const ctx = canvas.getContext('2d');
        //     if (ctx) {
        //         // let region = new Path2D();
        //         // region.rect(0, 0, canvas.width, canvas.height);
        //         // ctx.clip(region);

        //         // ctx.save();
        //         // ctx.font = '16px Arial';
        //         // ctx.fillStyle = 'yellow';
        //         // ctx.strokeStyle = 'black';
        //         // ctx.lineWidth = 2;
        //         // const text = `relX: ${relX.toFixed(1)}, relY: ${relY.toFixed(1)}, col: ${col}, row: ${row}`;
        //         // const textX = mouseX + 10;
        //         // const textY = mouseY + 100;
        //         // ctx.strokeText(text, textX, textY);
        //         // ctx.fillText(text, textX, textY);
        //         // ctx.restore();

        //         ctx.save();
        //         ctx.strokeStyle = 'white';
        //         ctx.lineWidth = 2;
        //         // Calculate the top-left corner of the tile in screen coordinates
        //         const tile = tilesLibrary.find(t => t.code === map[row][col]);
        //         const tileWidth = 64 * camera.zoomLevel;
        //         const tileHeight = 32 * camera.zoomLevel;
        //         const x = (col - row) * tileWidth / 2 + mapX;
        //         const y = (col + row) * tileHeight / 2 + mapY - ((tile?.height ? tile.height : BASE_TILE_HEIGHT) - BASE_TILE_HEIGHT) * camera.zoomLevel;

        //         // Draw diamond
        //         ctx.beginPath();
        //         ctx.moveTo(x + tileWidth / 2, y); // top
        //         ctx.lineTo(x + tileWidth, y + tileHeight / 2); // right
        //         ctx.lineTo(x + tileWidth / 2, y + tileHeight); // bottom
        //         ctx.lineTo(x, y + tileHeight / 2); // left
        //         ctx.closePath();
        //         ctx.stroke();
        //         ctx.restore();

        //         // Draw square of detected tile
        //         ctx.save();
        //         ctx.strokeStyle = 'red';
        //         ctx.lineWidth = 2;
        //         ctx.strokeRect(x, y, tileWidth, tileHeight);
        //         ctx.restore();
        //     }

        //     // console.log(`Clicked map row: ${row}, column: ${col}`);
        // });