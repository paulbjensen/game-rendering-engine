<script lang="ts">
    import { onMount } from 'svelte';
    import { imageHasLoaded, } from './utils';
    import { map, tilesLibrary, mapRows, mapColumns, BASE_TILE_WIDTH, BASE_TILE_HEIGHT } from './mapAndTiles';
    import { fps } from "@sveu/browser"
    import type { Direction } from './types';
    import eventEmitter from './eventEmitter';

    const fpsResult = fps();

    /* Camera settings */
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;


    onMount(async () => {
        /*
            Create an isometric tile map in the game world using HTML5 canvas.

            This is fun but will it handle everything that is needed, 
            especially characters and clicking on objects?
        */

        /* Track mouse */
        let mouseX = 0;
        let mouseY = 0;

        function trackMousePosition(e: MouseEvent | null) {
            if (!e) {
                mouseX = 0;
                mouseY = 0;
                return;
            }
            // Get canvas bounding rect and mouse position relative to canvas
            const rect = cursorCanvas?.getBoundingClientRect();
            if (!rect) return;
            mouseX = (e.clientX - rect.left);
            mouseY = (e.clientY - rect.top);
        }

        /* Used to track if we are panning */
        let panningInterval: ReturnType<typeof setInterval> | null = null;

        /*
            Used to track the directions in which the camera will pan.

            We need to track multiple direction in case the user wants
            to pan diagonally by holding down two arrow keys at once.
        */
        const activePanningDirections: Direction[] = [];

        /*
            A reference for the drawMap function that is
            in the code in multiple locations
        */
        let drawMap: ((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) | null = null;
        let drawCursor: (() => void) | null = null;

        const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
        const cursorCanvas = document.getElementById('cursor') as HTMLCanvasElement;

        if (!mapCanvas || !cursorCanvas) {
            const message = 'One of the canvas elements was not found';
            console.error(message);
            throw new Error(message);
        }


        // Create the offline map, and draw it later
        const offscreen = document.getElementById('fullscale-offscreen-map') as HTMLCanvasElement;
        offscreen.width = mapRows * BASE_TILE_WIDTH;
        offscreen.height = mapColumns * BASE_TILE_HEIGHT;

        function resampleMap() {
            const ctx = mapCanvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

            // Calculate source width/height based on zoom
            const srcWidth = offscreen.width / zoomLevel;
            const srcHeight = offscreen.height / zoomLevel;

            // Calculate destination size to match aspect ratio
            const srcAspect = srcWidth / srcHeight;
            let destWidth = mapCanvas.width;
            let destHeight = mapCanvas.height;

            if (destWidth / destHeight > srcAspect) {
            // Canvas is wider than source: fit height
            destWidth = destHeight * srcAspect;
            } else {
            // Canvas is taller than source: fit width
            destHeight = destWidth / srcAspect;
            }

            // Center the image in the canvas
            const dx = (mapCanvas.width - destWidth) / 2;
            const dy = (mapCanvas.height - destHeight) / 2;

            ctx.drawImage(
            offscreen,
            panX, panY, srcWidth, srcHeight,
            dx, dy, destWidth, destHeight
            );
        }





        /* Resizes the canvas so that it always fits within the window */
        function resizeCanvases() {
            mapCanvas.width = window.innerWidth;
            mapCanvas.height = window.innerHeight;
            cursorCanvas.width = window.innerWidth;
            cursorCanvas.height = window.innerHeight;
            const ctxOff = offscreen.getContext('2d');
            drawMap?.(ctxOff, offscreen);
            resampleMap();
        }

        // Call the resizeCanvases function initially and when the window is resized
        window.addEventListener('resize', resizeCanvases);

        /*
            This function draws the map onto the canvas.
            It calculates the position of each tile based on the map data,
            the zoom level, and the pan offsets.
        */
        drawMap = (ctx, canvas) => {
            // NOTE - at some point we will want to architect the code to make this more efficient

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
            const offsetX = mapRows * (BASE_TILE_WIDTH / 2) - (BASE_TILE_WIDTH / 2);

            /*
                15 * 64 * zoomLevel
                // Assume zoomLevel is 1
                15 * 64

                960px
            */
            const mapRowsPixels = mapRows * BASE_TILE_WIDTH;

            /*
                15 * 32 * zoomLevel
                // Assume zoomLevel is 1
                15 * 32

                480px
            */
            const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT;
 
 
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
            const mapX = centerX - mapRowsPixels / 2;
            
            /*
                300px - (480 / 2) + panY (assume it is 0 for now)

                300 - 240 + 0

                60px
            */
            const mapY = centerY - mapColumnsPixels / 2;

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

                            const x = (column - row) * tile.width / 2 + mapX;
                            const y = (column + row) * BASE_TILE_HEIGHT / 2 + mapY - ((tile.height - BASE_TILE_HEIGHT));
                            ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width, tile.height);
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
                        const x = (column - row) * tile.width / 2 + mapX;
                        const y = (column + row) * BASE_TILE_HEIGHT / 2 + mapY - ((tile.height - BASE_TILE_HEIGHT));
                        ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width, tile.height);
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
            When the user pressed a keyboard key down, we will check what key it is,
            and execute any action that is linked to that key.
        */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !activePanningDirections.includes('left')) {
                // Start panning left
                eventEmitter.emit('startPanning', 'left');
            } else if (e.key === 'ArrowRight' && !activePanningDirections.includes('right')) {
                // Start panning right
                eventEmitter.emit('startPanning', 'right');
            } else if (e.key === 'ArrowUp' && !activePanningDirections.includes('up')) {
                // Start panning up
                eventEmitter.emit('startPanning', 'up');
            } else if (e.key === 'ArrowDown' && !activePanningDirections.includes('down')) {
                // Start panning down
                eventEmitter.emit('startPanning', 'down');
            } else if (e.key === '-') {
                eventEmitter.emit('zoomOut');
            } else if (e.key === '=') {
                // Zoom in
                eventEmitter.emit('zoomIn');
            } else if (e.key === '0') {
                // Reset zoom to 1
                eventEmitter.emit('resetZoom');
            } else if (e.key === 'c') {
                // Center the map
                eventEmitter.emit('recenter');
            }
        });

        /*
            When the user releases a keyboard key, we will check what key it is,
            and execute any action that is linked to that key.

            This is useful for stopping panning when the user releases the arrow keys.
        */
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') {
                // Stop panning left
                eventEmitter.emit('stopPanning', 'left');
            } else if (e.key === 'ArrowRight') {
                // Stop panning right
                eventEmitter.emit('stopPanning', 'right');
            } else if (e.key === 'ArrowUp') {
                // Stop panning up
                eventEmitter.emit('stopPanning', 'up');
            } else if (e.key === 'ArrowDown') {
                // Stop panning down
                eventEmitter.emit('stopPanning', 'down');
            }
        });

        /*
            Touch controls for panning and zooming on mobile/tablet devices.
        */
        let lastTouchX = 0;
        let lastTouchY = 0;
        let lastTouchDistance = 0;
        let isTouchPanning = false;

        mapCanvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Single finger: start panning
                isTouchPanning = true;
                const rect = mapCanvas.getBoundingClientRect();
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

        mapCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = mapCanvas.getBoundingClientRect();
            if (e.touches.length === 1 && isTouchPanning) {
                // Panning
                const touchX = e.touches[0].clientX - rect.left;
                const touchY = e.touches[0].clientY - rect.top;
                const dx = touchX - lastTouchX;
                const dy = touchY - lastTouchY;
                panX += dx;
                panY += dy;
                lastTouchX = touchX;
                lastTouchY = touchY;
                resampleMap?.();
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (lastTouchDistance) {
                    const zoomFactor = distance / lastTouchDistance;
                    zoomLevel *= zoomFactor;
                    resampleMap?.();
                }
                lastTouchDistance = distance;
            }
        }, { passive: false });

        mapCanvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isTouchPanning = false;
                lastTouchDistance = 0;
            }
        });

        /* * Start panning in a specific direction
            * @param {string} direction - The direction to pan ('left', 'right', 'up', 'down')
            * This function starts an interval that pans the map in the specified direction.
            * If the interval is already running, it will not start a new one.
            * 
            * // TODO - implement use of requestAnimationFrame instead of setInterval
        */
        function startPanning(direction:Direction) {
            const panSpeed = 10; // Adjust the panning speed as needed
            activePanningDirections.push(direction);
            if (!panningInterval) {
                panningInterval = setInterval(() => {
                    for (const dir of activePanningDirections) {
                        if (dir === 'left') {
                            panX += panSpeed;
                        } else if (dir === 'right') {
                            panX -= panSpeed;
                        } else if (dir === 'up') {
                            // We move 1/2 the speed in the y direction because 
                            // then when we do diagonal scrolling, it matches the 
                            // isometric tile ratio better.
                            panY += panSpeed / 2;
                        } else if (dir === 'down') {
                            panY -= panSpeed / 2;
                        }
                    }
                    resampleMap?.();
                    drawCursor?.();
                }, (1000 / 60));
            }
        }

        /* Stop panning in a specific direction
            * @param {string} direction - The direction to stop panning ('left', 'right', 'up', 'down')
            * This function stops the panning interval for the specified direction.
        */
        function stopPanning(direction:Direction) {
            const index = activePanningDirections.indexOf(direction);
            if (index !== -1) {
                activePanningDirections.splice(index, 1);
            }
            if (activePanningDirections.length === 0) {
                if (panningInterval) clearInterval(panningInterval);
                panningInterval = null;
            }
        }

        // TODO - eventually change these to perform scale/transform operations on the map, rather than redraw it in its entirety

        function zoomIn() {
            zoomLevel *= 1.1; // Adjust the zoom factor as needed
            resampleMap?.();
            drawCursor?.();
        }

        function zoomOut() {
            zoomLevel /= 1.1; // Adjust the zoom factor as needed
            resampleMap?.();
            drawCursor?.();
        }

        function resetZoom() {
            zoomLevel = 1;
            resampleMap?.();
            drawCursor?.();
        }

        function recenter() {
            panX = 0;
            panY = 0;
            resampleMap?.();
            drawCursor?.();
        }

        /*
            Listen to mousewheel events to zoom in and out.
        */
        mapCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                eventEmitter.emit('zoomIn');
            } else {
                eventEmitter.emit('zoomOut');
            }
            resampleMap?.();
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
        mapCanvas.addEventListener('mousedown', (e) => {
            suppressClick = false;
            isDragging = true;
            const rect = mapCanvas.getBoundingClientRect();
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
        mapCanvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = mapCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const dx = mouseX - lastMouseX;
            const dy = mouseY - lastMouseY;
            panX += dx;
            panY += dy;
            velocityX = dx;
            velocityY = dy;
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            dragDistance += Math.sqrt(dx * dx + dy * dy);
            if (dragDistance > dragThreshold) {
                suppressClick = true;
            }
            resampleMap?.();
        });

        /*
            Stop tracking mouse movement when dragging ends, but still apply a nice
            velocity effect on the map, so that it continues to move.
        */
        mapCanvas.addEventListener('mouseup', () => {
            isDragging = false;
            const friction = 0.95;
            function applyMomentum() {
                velocityX *= friction;
                velocityY *= friction;
                panX += velocityX;
                panY += velocityY;
                resampleMap?.();
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
        mapCanvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        drawCursor = () => {
            if (suppressClick) {
                suppressClick = false;
                return;
            }

            // Calculate map offset as in drawMap
            const offsetX = mapRows * (BASE_TILE_WIDTH / 2) * zoomLevel - (BASE_TILE_WIDTH / 2) * zoomLevel;
            const offsetY = mapColumns * (BASE_TILE_HEIGHT / 2) * zoomLevel - (BASE_TILE_HEIGHT / 2) * zoomLevel;
            const mapRowsPixels = mapRows * BASE_TILE_WIDTH * zoomLevel;
            const mapColumnsPixels = mapColumns * BASE_TILE_HEIGHT * zoomLevel;
            const centerX = cursorCanvas.width / 2 + offsetX;
            const centerY = cursorCanvas.height / 2;
            const mapX = centerX - mapRowsPixels / 2 + panX;
            const mapY = centerY - mapColumnsPixels / 2 + panY;
            // console.log({ offsetX, offsetY, mapRowsPixels, mapColumnsPixels, centerX, centerY, mapX, mapY});

            // Convert mouse position to map coordinates
            const relX = mouseX - mapX;
            const relY = mouseY - mapY; // Hmm, this value seems to adjust with scale 

            // Inverse isometric transform
            const tileW = BASE_TILE_WIDTH * zoomLevel;
            const tileH = BASE_TILE_HEIGHT * zoomLevel;
            const col = Math.floor((relX / (tileW / 2) + relY / (tileH / 2)) / 2);
            const row = Math.floor((relY / (tileH / 2) - relX / (tileW / 2)) / 2);

            // TODO - trigger the redraw if the column and row value changes - (it will be recalculated on each mousemove, but we don't need to render the selector if it hasn't changed the column and row)
            // NOTE - We will also need to trigger this whenever we change the pan/zoom values on the map as well - otherwise the grid calculation is detached from the map.

            const ctx = cursorCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);


                ctx.save();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                // Calculate the top-left corner of the tile in screen coordinates
                const tile = tilesLibrary.find(t => t.code === map[row][col]);
                const tileWidth = 64 * zoomLevel;
                const tileHeight = 32 * zoomLevel;
                const x = (col - row) * tileWidth / 2 + mapX;
                const y = (col + row) * tileHeight / 2 + mapY - ((tile?.height ? tile.height : BASE_TILE_HEIGHT) - BASE_TILE_HEIGHT) * zoomLevel;

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
        }

        // NOTE - clicks are not triggering, but we do have mouse dragging to move around the canvas at the moment
        cursorCanvas.addEventListener('mousemove', (e) => {
            trackMousePosition(e);
            drawCursor();
        });

        /* Load the map when all of the images are ready to be rendered */
        function loadMapWhenReady() {
            const tilesLoaded = tilesLibrary.every(t => imageHasLoaded(t.image));
            const mapLoaded = map && map.length > 0;

            if (tilesLoaded && mapLoaded) {
                resizeCanvases();
            } else {
                setTimeout(loadMapWhenReady, 100);
            }
        }

        loadMapWhenReady();



        // Event bindings are here

        eventEmitter.on('startPanning', (direction) => {
            console.log(`Started panning ${direction}`);
            startPanning(direction);
        });

        eventEmitter.on('stopPanning', (direction) => {
            console.log(`Stopped panning ${direction}`);
            stopPanning(direction);
        });

        eventEmitter.on('zoomIn', () => {
            console.log(`Zooming in`);
            zoomIn();
        });

        eventEmitter.on('zoomOut', () => {
            console.log(`Zooming out`);
            zoomOut();
        });

        eventEmitter.on('resetZoom', () => {
            console.log(`Resetting zoom`);
            resetZoom();
        });

        eventEmitter.on('recenter', () => {
            console.log(`Recentering`);
            recenter();
        });

    });

</script>

<style>
</style>

<main>
    <canvas id="fullscale-offscreen-map">
        Your browser does not support the canvas element.
    </canvas>
    <div id="canvas-layers">

        <canvas id="map" style:transform={`translate(${panX}px, ${panY}px) scale(${zoomLevel})`}>
        </canvas>
        <canvas id="cursor">
        </canvas>
    </div>
    <div id="fps-count">{$fpsResult} fps</div>

    <!-- <div id="toolbar">
        <button id="reset-view">Reset View</button>
        <button id="zoom-in">Zoom In</button>
        <button id="zoom-out">Zoom Out</button>
    </div> -->
</main>