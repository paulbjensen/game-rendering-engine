<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { fps } from "@sveu/browser"
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard, { type KeyboardOptions} from './controls/Keyboard';
    import Touch from './controls/Touch';
    import Mouse from './controls/Mouse';
    import Cursor from './controls/Cursor';
    import GameMap from './GameMap';
    import type { AppMode, MapData, ImageAsset } from './types';
    import { loadJSON } from './utils';
	import ImageAssetSet from './assets/ImageAssetSet';
    import Sidebar from './Sidebar.svelte';
    import TopBar from './TopBar.svelte';
	import app from './main';

    const fpsResult = fps();

    const camera = new Camera({ eventEmitter, maxZoomLevel: 4, minZoomLevel: 0.5 });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter });
    const cursor = new Cursor({eventEmitter});
    let gameMap: GameMap | null = null;

    let imageAssetSet: ImageAssetSet | null = $state(null);

    let selectedImageAsset: ImageAsset | null = $state(null);

    let appMode: AppMode = $state('navigation');

    const setAppmode = (mode: AppMode) => {
        if (mode === "navigation") {
            mouse.mousePanning = true;
            selectedImageAsset = null;
        } else if (mode === "edit") {
            mouse.mousePanning = false;
        }
        appMode = mode;
    };

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
    };

    // Attach the keyboard event listeners
    const keyboard = new Keyboard(keyboardOptions);
    keyboard.attach();

    onMount(async () => {

        const map: MapData = await loadJSON('/maps/128x128.json');
        const imageAssets = await loadJSON('/imageAssetSets/1.json');

        imageAssetSet = new ImageAssetSet({
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
        cursor.attach({ target: canvas, camera, gameMap: gameMap });

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
        eventEmitter.on('selectImageAsset', (imageAsset: ImageAsset) => {
            console.log('Selected image asset', imageAsset);
            selectedImageAsset = imageAsset;
        });
        eventEmitter.on('click', (tile: [number, number] | null) => {
            if (tile && selectedImageAsset && gameMap) {
                console.log('Placing tile', selectedImageAsset, 'at', tile);
                if (Array.isArray(tile)) {
                    gameMap.map[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                } else {
                    gameMap.map[tile] = [0, selectedImageAsset.code];
                }
                gameMap.draw();
            }
        });
        eventEmitter.on('setAppMode', setAppmode);

        // Load map assets then resize the canvas once loaded
        await gameMap?.load();
        resizeCanvas();

    });

    // When unmounting the component
    onDestroy(() => {
        keyboard.detach();
        touch.detach();
        mouse.detach();
        cursor.detach();
    });
</script>

<style>
    #fps-count {
        position: absolute;
        top: 20px;
        right: 20px;
        border: solid 1px rgba(255,255,255,0.2);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
        padding: 8px;
        border-radius: 8px;
        background: rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        color: white;
        font-family:Arial, Helvetica, sans-serif;
        text-transform: uppercase;
        font-weight: bold;
    }

    #map {
        cursor: move;
        width:100vw;
        height:100vh;
    }
</style>

<main>
    <div id="fps-count">{$fpsResult} fps</div>
    <canvas id="map">
        Your browser does not support the canvas element.
    </canvas>
    {#if imageAssetSet && appMode==="edit"}
        <Sidebar {imageAssetSet} {eventEmitter} {selectedImageAsset} />
    {/if}
    <TopBar {appMode} {eventEmitter} />
</main>