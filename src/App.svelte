<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { imageHasLoaded, } from './utils';
    import { map, tilesLibrary, mapRows, mapColumns, BASE_TILE_WIDTH, BASE_TILE_HEIGHT } from './mapAndTiles';
    import {fps} from "@sveu/browser"
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard, { type KeyboardOptions} from './controls/Keyboard';
    import Touch from './controls/Touch';
    import Mouse from './controls/Mouse';

    const fpsResult = fps();

    const camera = new Camera({ eventEmitter });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter });

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
            'ArrowRight': () => eventEmitter.emit('stopPanning', 'right')
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

        const canvas = document.getElementById('map') as HTMLCanvasElement;
        touch.attach(canvas);
        mouse.attach(canvas);

        if (!canvas) {
            console.error('Canvas element not found');
            throw new Error('Canvas element not found');
        }

        /*
            This function draws the map onto the canvas.
            It calculates the position of each tile based on the map data,
            the zoom level, and the pan offsets.
        */
        const drawMap = () => {
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

        /* Resizes the canvas so that it always fits within the window */
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawMap?.();
        }

        // Call the resizeCanvas function initially and when the window is resized
        window.addEventListener('resize', resizeCanvas);

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

        // EventEmitter bindings
        eventEmitter.on('startPanning', camera.startPanning);
        eventEmitter.on('stopPanning', camera.stopPanning);
        eventEmitter.on('pan', camera.addPan);
        eventEmitter.on('adjustZoom', (zoomFactor:number) => camera.setZoom(camera.zoomLevel * zoomFactor));
        eventEmitter.on('zoomOut', camera.zoomOut);
        eventEmitter.on('zoomIn', camera.zoomIn);
        eventEmitter.on('resetZoom', camera.resetZoom);
        eventEmitter.on('recenter', camera.resetPan);
        eventEmitter.on('cameraUpdated', drawMap);

        loadMapWhenReady();
    });

    // When unmounting the component
    onDestroy(() => {
        keyboard.detach();
        touch.detach();
        mouse.detach();
    });
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