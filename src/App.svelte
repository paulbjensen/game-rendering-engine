<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import {fps} from "@sveu/browser"
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard, { type KeyboardOptions} from './controls/Keyboard';
    import Touch from './controls/Touch';
    import Mouse from './controls/Mouse';
    import GameMap from './GameMap';
    import type { MapData } from './types';
    import { loadJSON } from './utils';
	import ImageAssetSet from './assets/ImageAssetSet';

    const fpsResult = fps();

    const camera = new Camera({ eventEmitter });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter });
    let gameMap: GameMap | null = null;

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

        const map: MapData = await loadJSON('/maps/16x16.json');
        const imageAssets = await loadJSON('/imageAssetSets/1.json');

        const imageAssetSet = new ImageAssetSet({
            imageAssets,
            baseTileWidth: 64,
            baseTileHeight: 32
        });

        /*
            Create an isometric tile map in the game world using HTML5 canvas.

            This is fun but will it handle everything that is needed, 
            especially characters and clicking on objects?
        */
        const canvas = document.getElementById('map') as HTMLCanvasElement;
        gameMap = new GameMap({ target: canvas, camera, map, imageAssetSet });

        touch.attach(canvas);
        mouse.attach(canvas);

        if (!canvas) {
            console.error('Canvas element not found');
            throw new Error('Canvas element not found');
        }

        /* Resizes the canvas so that it alw ays fits within the window */
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gameMap?.draw();
        }

        // Call the resizeCanvas function initially and when the window is resized
        window.addEventListener('resize', resizeCanvas);

        /* Load the map when all of the images are ready to be rendered */
        function loadMapWhenReady() {
            gameMap?.loadImageAssets();
            if (gameMap?.hasLoaded()) {
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
        eventEmitter.on('cameraUpdated', gameMap.draw);
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