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
	import WelcomeScreen from './modals/welcome/WelcomeScreen.svelte';
    import GameManager from './lib/GameManager/GameManager';
    import LoadModal from './modals/load/LoadModal.svelte';
    import SaveModal from './modals/save/SaveModal.svelte';

    let enableFPSCounter = $state(false);
    const fpsResult = fps();

    const camera = new Camera({ eventEmitter, maxZoomLevel: 4, minZoomLevel: 0.5 });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter });
    const cursor = new Cursor({eventEmitter});
    const gameManager = new GameManager();
    let gameMap: GameMap | null = null;

    let imageAssetSet: ImageAssetSet | null = $state(null);

    let selectedImageAsset: ImageAsset | null = $state(null);

    let appMode: AppMode = $state('navigation');

    let gameName: string = $state('currentGame');

    // Toggles showing/hiding the load modal
    let showLoadModal = $state(false);
    
    // Toggles showing/hiding the save modal
    let showSaveModal = $state(false);

    const setAppmode = (mode: AppMode) => {
        if (mode === "navigation") {
            mouse.mousePanning = true;
            mouse.momentum = true;
            selectedImageAsset = null;
        }
        appMode = mode;
    };

    let hideWelcomeScreen = $state(false);

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
            'c': () => eventEmitter.emit('recenter'),
            'd': () => eventEmitter.emit('toggleFPSCounter')
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
        const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
        const cursorCanvas = document.getElementById('cursor') as HTMLCanvasElement;
        if (!mapCanvas || !cursorCanvas) {
            console.error('Canvas element for map or cursor not found');
            throw new Error('Canvas element for map or cursor not found');
        }

        gameMap = new GameMap({ target: mapCanvas, cursorTarget: cursorCanvas, camera, map, imageAssetSet });

        // NOTE - check if touch needs to be attached to cursor canvas
        touch.attach(cursorCanvas);
        mouse.attach(cursorCanvas);
        cursor.attach({ target: cursorCanvas, camera, gameMap: gameMap });

        /* Resizes the canvas elements so that they always fit within the window */
        function resizeCanvases() {
            const canvasElements = [mapCanvas, cursorCanvas];
            canvasElements.forEach(canvas => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            });
            gameMap?.draw();
        }

        /*
            Selects an image asset and toggles mouse panning and momentum as 
            we want to be able to apply a set of tiles by selecting multiple tiles  
        */
        function selectImageAsset (imageAsset: ImageAsset | null) {
            if (imageAsset && appMode === 'edit') {
                mouse.mousePanning = false;
                mouse.momentum = false;
                cursor.enablePainting = true;
                cursor.setPaintConstraint(imageAsset.paintConstraint);
            } else {
                cursor.enablePainting = false;
                mouse.mousePanning = true;
                mouse.momentum = true;
            }
            selectedImageAsset = imageAsset;
        }

        /* 
            Adjusts the zoom based on the zoomFactor number and zoom level
            Used by the touch controls.
        */
        function adjustZoom (zoomFactor:number) {
            camera.setZoom(camera.zoomLevel * zoomFactor);
        }

        // Call the resizeCanvas function initially and when the window is resized
        window.addEventListener('resize', resizeCanvases);

        // EventEmitter bindings
        eventEmitter.on('startPanning', camera.startPanning);
        eventEmitter.on('stopPanning', camera.stopPanning);
        eventEmitter.on('pan', camera.addPan);
        eventEmitter.on('adjustZoom', adjustZoom);
        eventEmitter.on('zoomOut', camera.zoomOut);
        eventEmitter.on('zoomIn', camera.zoomIn);
        eventEmitter.on('resetZoom', camera.resetZoom);
        eventEmitter.on('recenter', camera.resetPan);
        eventEmitter.on('cameraUpdated', () => {
            if (!gameMap) return;
            gameMap.draw();
            if (
                gameMap.selectedTile    
            ) {
                gameMap.drawCursorAt(...gameMap.selectedTile)
            }
        });
        eventEmitter.on('selectImageAsset', selectImageAsset);
        eventEmitter.on('click', (tile: [number, number] | null) => {
            if (tile && selectedImageAsset && gameMap) {
                if (Array.isArray(tile)) {
                    gameMap.map[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                } else {
                    gameMap.map[tile] = [0, selectedImageAsset.code];
                }
                gameMap.draw();
            }
        });
        eventEmitter.on('clickBatch', (tiles: [number, number][]) => {
            if (tiles.length === 0) return;
            if (selectedImageAsset && gameMap) {
                for (const tile of tiles) {
                    gameMap.map[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                }
                gameMap.draw();
            }
        });

        eventEmitter.on('drawPreview', (tiles: [number, number][]) => {
            if (tiles.length === 0) return;
            if (selectedImageAsset && gameMap) {
                gameMap.drawPreview(tiles);
            }
        });

        eventEmitter.on('clearPreview', () => {
            if (gameMap) { gameMap.clearPreview(); }
        });

        eventEmitter.on('setAppMode', setAppmode);
        eventEmitter.on('saveGame', (name:string) => {
            if (gameMap) {
                gameName = name;
                gameManager.save(name, gameMap.map);
                alert('Game saved!');
            }
        });
        eventEmitter.on('loadGame', (name?:string) => {
            if (!name) name = 'currentGame';
            gameName = name;
            const game = gameManager.load(name);
            if (game && gameMap) {
                gameMap.updateMap(game.data);
                gameMap.draw();
            }
        });

        eventEmitter.on('deleteGame', (name:string) => {
            if (confirm("Are you sure you want to delete this game?")) {
                gameManager.delete(name);
                alert('Game deleted!');
            }
        });

        eventEmitter.on('toggleFPSCounter', () => {
            enableFPSCounter = !enableFPSCounter;
        });

        eventEmitter.on('showLoadModal', () => {
            showLoadModal = true;
        });

        eventEmitter.on('showSaveModal', () => {
            showSaveModal = true;
        });




        // Load map assets then resize the canvas once loaded
        await gameMap?.load();
        resizeCanvases();

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
        z-index: 3;
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

    #map, #cursor {
        position:absolute;
        top: 0px;
        left: 0px;
        cursor: move;
        width:100vw;
        height:100dvh;
    }

</style>

<main>
    {#if enableFPSCounter}
        <div id="fps-count">{$fpsResult} fps</div>
    {/if}
    <div id="game">
        <canvas id="map">
            Your browser does not support the canvas element.
        </canvas>
        <canvas id="cursor"></canvas>
    </div>
    {#if imageAssetSet}
        <Sidebar {imageAssetSet} {eventEmitter} {selectedImageAsset} hidden={appMode !== "edit"} />
    {/if}
    <TopBar {appMode} {eventEmitter} />
    {#if !hideWelcomeScreen}
        <WelcomeScreen {gameManager} {eventEmitter} hide={() => hideWelcomeScreen = true} />
    {/if}
    {#if showLoadModal}
        <LoadModal {gameManager} {eventEmitter} hide={() => showLoadModal = false} />
    {/if}
    {#if showSaveModal}
        <SaveModal {gameManager} {eventEmitter} {gameName} hide={() => showSaveModal = false} />
    {/if}
</main>