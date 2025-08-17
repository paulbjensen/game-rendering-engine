<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { imageHasLoaded, } from './utils';
    import { map, tilesLibrary, mapRows, mapColumns, BASE_TILE_WIDTH, BASE_TILE_HEIGHT } from './mapAndTiles';
    import {fps} from "@sveu/browser"
    import type { Direction } from './types';
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard, { type KeyboardOptions} from './Keyboard';

    const fpsResult = fps();

    const camera = new Camera({eventEmitter});

    // Keyboard controls specified here
    const keyboardOptions: KeyboardOptions = {
        keydown: {
            'ArrowUp': () => eventEmitter.emit('startPanning', 'up'),
            'ArrowDown': () => eventEmitter.emit('startPanning', 'down'),
            'ArrowLeft': () => eventEmitter.emit('startPanning', 'left'),
            'ArrowRight': () => eventEmitter.emit('startPanning', 'right'),
            '=': () => eventEmitter.emit('zoomIn'),
            '-': () => eventEmitter.emit('zoomOut'),
            '0': () => eventEmitter.emit('resetZoom'),
            'c': () => eventEmitter.emit('recenter')
        },
        keyup: {
            'ArrowUp': () => eventEmitter.emit('stopPanning', 'up'),
            'ArrowDown': () => eventEmitter.emit('stopPanning', 'down'),
            'ArrowLeft': () => eventEmitter.emit('stopPanning', 'left'),
            'ArrowRight': () => eventEmitter.emit('stopPanning', 'right'),
        }
    } ;

    // Attach the keyboard event listeners
    const keyboard = new Keyboard(keyboardOptions);
    keyboard.attach();

    onMount(async () => {
        /*
            Create an isometric tile map in the game world using HTML5 canvas.

            This is fun but will it handle everything that is needed, 
            especially characters and clicking on objects?
        */


        /* Camera settings */

        /*
            A reference for the drawMap function that is
            in the code in multiple locations
        */
        let drawMap: (() => void) | null = null;

        const canvas = document.getElementById('map') as HTMLCanvasElement;

        if (!canvas) {
            console.error('Canvas element not found');
            throw new Error('Canvas element not found');
        }

        /* Resizes the canvas so that it always fits within the window */
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawMap?.();
        }

        // Call the resizeCanvas function initially and when the window is resized
        window.addEventListener('resize', resizeCanvas);

        /*
            This function draws the map onto the canvas.
            It calculates the position of each tile based on the map data,
            the zoom level, and the pan offsets.
        */
        drawMap = () => {
            // NOTE - at some point we will want to architect the code to make this more efficient
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                return;
            }
            // let region = new Path2D();
            // region.rect(0, 0, canvas.width, canvas.height);
            // ctx.clip(region);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            /* 
                Calculate the offsets and dimensions for the map 
                
                (NOTE - mapRows is 15 - maybe numColumns/numRows would be a better name for the variable)

                15 * (64 / 2) * zoomLevel - (64 / 2) * zoomLevel
                15 * 32 * zoomLevel - 32 * zoomLevel
                // Assume zoomLevel is 1
                15 * 32 - 32 (this is the width of the map in pixels)

                448px
            */
            const offsetX = mapRows * (BASE_TILE_WIDTH / 2) * camera.zoomLevel - (BASE_TILE_WIDTH / 2) * camera.zoomLevel;

            /*
                15 * 64 * zoomLevel
                // Assume zoomLevel is 1
                15 * 64

                960px
            */
            const mapRowsPixels = mapRows * BASE_TILE_WIDTH * camera.zoomLevel;

            /*
                15 * 32 * zoomLevel
                // Assume zoomLevel is 1
                15 * 32

                480px
            */
            const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT * camera.zoomLevel;
 
            /*
                Assume canvas width is 1200px in this example
                1200 / 2 + 448
                
                1048px
            */
            const centerX = canvas.width / 2 + offsetX;


            /*
                Assume canvas height is 600px in this example
                600 / 2 + 300

                300px
            */
            const centerY = canvas.height / 2;


            /*
                1048 - (480 / 2) + panX (assume it is 0 for now)

                1048 - 240 + 0

                808px
            */
            const mapX = centerX - mapRowsPixels / 2 + camera.panX;
            
            /*
                300px - (480 / 2) + panY (assume it is 0 for now)

                300 - 240 + 0

                60px
            */
            const mapY = centerY - mapColumnsPixels / 2 + camera.panY;

            // row is mapped to width, height to column
            for (let row = 0; row < mapRows; row++) {
                for (let column = 0; column < mapColumns; column++) {

                    // An array of arrays, it's nested by row, then by column
                    const tileCode = map[row][column];
                    if (Array.isArray(tileCode)) {
                        // If the tile code is an array, we need to render multiple tiles
                        for (const code of tileCode) {
                            const tile = tilesLibrary.find(t => t.code === code);
                            if (!tile) continue;

                            const x = (column - row) * tile.width / 2 * camera.zoomLevel + mapX;
                            const y = (column + row) * BASE_TILE_HEIGHT / 2 * camera.zoomLevel + mapY - ((tile.height - BASE_TILE_HEIGHT) * camera.zoomLevel);
                            ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * camera.zoomLevel, tile.height * camera.zoomLevel);
                        }
                        continue; // Skip to the next column
                    } else {
                        const tile = tilesLibrary.find(t => t.code === tileCode);
                        /* 
                            If the tile is not found, skip this iteration. 
                            Continue is not a word I'd use for such an action, 
                            but JS does.
                        */
                        if (!tile) continue;


                        /* 
                            x is the column minus the row (why?) multiplied by half the tile width, multiplied by the zoom level and mapX added to it
                        */
                        const x = (column - row) * tile.width / 2 * camera.zoomLevel + mapX;
                        const y = (column + row) * BASE_TILE_HEIGHT / 2 * camera.zoomLevel + mapY - ((tile.height - BASE_TILE_HEIGHT) * camera.zoomLevel);
                        ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * camera.zoomLevel, tile.height * camera.zoomLevel);

                    }



                    // Text debugging for what column and row we are rendering from the map json array (0-indexed)
                    // ctx.font = '10px Arial';
                    // ctx.fillStyle = 'white';
                    // ctx.lineWidth = 2;
                    // const text = `${column},${row}`;
                    // const textX = x + tile.width * zoomLevel / 2;
                    // const textY = y + tile.height * zoomLevel / 2;
                    // // ctx.strokeText(text, textX, textY);
                    // ctx.fillText(text, textX - text.length * 2, textY + 2);
                    // ctx.restore();

                    // ctx.save();
                }
            }
        }    

        /*
            Touch controls for panning and zooming on mobile/tablet devices.
        */
        let lastTouchX = 0;
        let lastTouchY = 0;
        let lastTouchDistance = 0;
        let isTouchPanning = false;

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Single finger: start panning
                isTouchPanning = true;
                const rect = canvas.getBoundingClientRect();
                lastTouchX = e.touches[0].clientX - rect.left;
                lastTouchY = e.touches[0].clientY - rect.top;
            } else if (e.touches.length === 2) {
                // Two fingers: start zooming
                isTouchPanning = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            if (e.touches.length === 1 && isTouchPanning) {
                // Panning
                const touchX = e.touches[0].clientX - rect.left;
                const touchY = e.touches[0].clientY - rect.top;
                const dx = touchX - lastTouchX;
                const dy = touchY - lastTouchY;
                camera.addPan(dx, dy);
                lastTouchX = touchX;
                lastTouchY = touchY;
                drawMap?.();
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDistance) {
                    const zoomFactor = distance / lastTouchDistance;
                    camera.zoomLevel *= zoomFactor;
                    drawMap?.();
                }
                lastTouchDistance = distance;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isTouchPanning = false;
                lastTouchDistance = 0;
            }
        });

        /*
            Listen to mousewheel events to zoom in and out.
        */
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const action = e.deltaY < 0 ? 'zoomOut' : 'zoomIn';
            eventEmitter.emit(action);
        }, { passive: false });


        /* 
            GitHub Copilot wrote this - I described what I wanted, and it managed to 
            produce a solution that worked nicely. This is a nice timesaver, and 
            gives me a warm fuzzy feeling of enjoying programming.
        */
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let velocityX = 0;
        let velocityY = 0;
        let momentumAnimationFrame: number | null = null;

        /*
            This is used to prevent click events from firing when dragging

            At the moment it has the side effect of prevent the click event from 
            firing, but that's not a big issue right now. I'm just enjoying being 
            able to put together a PoC quite quickly.
        */
        let suppressClick = false;
        let dragThreshold = 5; // pixels
        let dragDistance = 0;

        /* This is used to intercept the mousedown event for when dragging starts */
        canvas.addEventListener('mousedown', (e) => {
            suppressClick = false;
            isDragging = true;
            const rect = canvas.getBoundingClientRect();
            lastMouseX = e.clientX - rect.left;
            lastMouseY = e.clientY - rect.top;
            velocityX = 0;
            velocityY = 0;
            dragDistance = 0;
            if (momentumAnimationFrame) {
                cancelAnimationFrame(momentumAnimationFrame);
                momentumAnimationFrame = null;
            }
        });

        /* We start tracking mouse movement for the dragging */
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const dx = mouseX - lastMouseX;
            const dy = mouseY - lastMouseY;
            camera.addPan(dx, dy);
            velocityX = dx;
            velocityY = dy;
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            dragDistance += Math.sqrt(dx * dx + dy * dy);
            if (dragDistance > dragThreshold) {
                suppressClick = true;
            }
            drawMap();
        });

        /*
            Stop tracking mouse movement when dragging ends, but still apply a nice
            velocity effect on the map, so that it continues to move.
        */
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            const friction = 0.95;
            function applyMomentum() {
                velocityX *= friction;
                velocityY *= friction;
                camera.addPan(velocityX, velocityY);
                drawMap?.();
                if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) {
                    momentumAnimationFrame = requestAnimationFrame(applyMomentum);
                } else {
                    momentumAnimationFrame = null;
                }
            }
            if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) {
                applyMomentum();
            }
        });

        /*
            This is used to intercept the mouseleave event for when dragging ends.

            Curious to find out the need for this on both the mouseup and 
            mouseleave events.
        */
        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // NOTE - clicks are not triggering, but we do have mouse dragging to move around the canvas at the moment
        canvas.addEventListener('mousemove', (e) => {
            if (suppressClick) {
                suppressClick = false;
                return;
            }

            // Get canvas bounding rect and mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // Calculate map offset as in drawMap
            const offsetX = mapRows * (BASE_TILE_WIDTH / 2) * camera.zoomLevel - (BASE_TILE_WIDTH / 2) * camera.zoomLevel;
            const offsetY = mapColumns * (BASE_TILE_HEIGHT / 2) * camera.zoomLevel - (BASE_TILE_HEIGHT / 2) * camera.zoomLevel;
            const mapRowsPixels = mapRows * BASE_TILE_WIDTH * camera.zoomLevel;
            const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT * camera.zoomLevel;
            const centerX = canvas.width / 2 + offsetX;
            const centerY = canvas.height / 2;
            const mapX = centerX - mapRowsPixels / 2 + camera.panX;
            const mapY = centerY - mapColumnsPixels / 2 + camera.panY;
            // console.log({ offsetX, offsetY, mapRowsPixels, mapColumnsPixels, centerX, centerY, mapX, mapY});

            // Convert mouse position to map coordinates
            const relX = mouseX - mapX;
            const relY = mouseY - mapY; // Hmm, this value seems to adjust with scale 

            // Inverse isometric transform
            const tileW = BASE_TILE_WIDTH * camera.zoomLevel;
            const tileH = BASE_TILE_HEIGHT * camera.zoomLevel;
            const col = Math.floor((relX / (tileW / 2) + relY / (tileH / 2)) / 2);
            const row = Math.floor((relY / (tileH / 2) - relX / (tileW / 2)) / 2);

            // Clamp to map bounds
            // if (col < 0 || col >= mapRows || row < 0 || row >= mapColumns) {
            //     console.log('Clicked outside map');
            //     return;
            // }

            // Almost perfect detects the tile clicked on, but we need to adjust for the isometric projection
            // map[row][col] = 3;
            drawMap();

            // TODO - have this draw in a 2nd layer above the main canvas

            // 1 - canvas for the map
            // 2 - for the mouse selection/hover/overlay 

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // let region = new Path2D();
                // region.rect(0, 0, canvas.width, canvas.height);
                // ctx.clip(region);

                // ctx.save();
                // ctx.font = '16px Arial';
                // ctx.fillStyle = 'yellow';
                // ctx.strokeStyle = 'black';
                // ctx.lineWidth = 2;
                // const text = `relX: ${relX.toFixed(1)}, relY: ${relY.toFixed(1)}, col: ${col}, row: ${row}`;
                // const textX = mouseX + 10;
                // const textY = mouseY + 100;
                // ctx.strokeText(text, textX, textY);
                // ctx.fillText(text, textX, textY);
                // ctx.restore();

                ctx.save();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                // Calculate the top-left corner of the tile in screen coordinates
                const tile = tilesLibrary.find(t => t.code === map[row][col]);
                const tileWidth = 64 * camera.zoomLevel;
                const tileHeight = 32 * camera.zoomLevel;
                const x = (col - row) * tileWidth / 2 + mapX;
                const y = (col + row) * tileHeight / 2 + mapY - ((tile?.height ? tile.height : BASE_TILE_HEIGHT) - BASE_TILE_HEIGHT) * camera.zoomLevel;

                // Draw diamond
                ctx.beginPath();
                ctx.moveTo(x + tileWidth / 2, y); // top
                ctx.lineTo(x + tileWidth, y + tileHeight / 2); // right
                ctx.lineTo(x + tileWidth / 2, y + tileHeight); // bottom
                ctx.lineTo(x, y + tileHeight / 2); // left
                ctx.closePath();
                ctx.stroke();
                ctx.restore();

                // Draw square of detected tile
                ctx.save();
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, tileWidth, tileHeight);
                ctx.restore();
            }

            console.log(`Clicked map row: ${row}, column: ${col}`);
        });

        /* Load the map when all of the images are ready to be rendered */
        function loadMapWhenReady() {
            const tilesLoaded = tilesLibrary.every(t => imageHasLoaded(t.image));
            const mapLoaded = map && map.length > 0;

            if (tilesLoaded && mapLoaded) {
                resizeCanvas();
            } else {
                setTimeout(loadMapWhenReady, 100);
            }
        }

        // Zoom and centering functions

        function zoomOut () {
            // Zoom out
            camera.setZoom(camera.zoomLevel / 1.1);
            drawMap?.();
        }

        function zoomIn () {
            // Zoom in
            camera.setZoom(camera.zoomLevel * 1.1);
            drawMap?.();
        }

        function resetZoom() {
            // Reset zoom to 1
            camera.resetZoom();
            drawMap?.();
        }

        function recenter() {
            // Center the map
            camera.resetPan();
            drawMap?.();
        }


        // EventEmitter bindings
        eventEmitter.on('startPanning', camera.startPanning);
        eventEmitter.on('stopPanning', camera.stopPanning);
        eventEmitter.on('zoomOut', zoomOut);
        eventEmitter.on('zoomIn', zoomIn);
        eventEmitter.on('resetZoom', resetZoom);
        eventEmitter.on('recenter', recenter);
        eventEmitter.on('cameraUpdated', drawMap);

        loadMapWhenReady();
    });

    // When unmounting the component
    onDestroy(keyboard.detach);
</script>

<style>
</style>

<main>
    <div id="fps-count">{$fpsResult} fps</div>
    <canvas id="map">
        Your browser does not support the canvas element.
    </canvas>
    <!-- <div id="toolbar">
        <button id="reset-view">Reset View</button>
        <button id="zoom-in">Zoom In</button>
        <button id="zoom-out">Zoom Out</button>
    </div> -->
</main>