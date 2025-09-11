<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard from './controls/keyboard/Keyboard';
    import Touch from './controls/Touch';
    import Mouse from './controls/Mouse';
    import Cursor from './controls/cursor/Cursor';
    import GameMap from './GameMap';
    import type { AppMode, MapDataV2, ImageAsset } from './types';
    import { loadJSON } from './utils';
	import ImageAssetSet from './assets/ImageAssetSet';
    import Sidebar from './Sidebar.svelte';
    import TopBar from './TopBar.svelte';
	import WelcomeScreen from './modals/welcome/WelcomeScreen.svelte';
    import GameManager from './lib/GameManager/GameManager';
    import LoadModal from './modals/load/LoadModal.svelte';
    import SaveModal from './modals/save/SaveModal.svelte';
    import keyboardOptions from './config/keyboardOptions';
    import FPSCounter from './lib/fpsCounter/FPSCounter.svelte';
    import inputDetector from './inputDetector';
    
    // Used to toggle the FPSCounter component via keyboard controls
    let enableFPSCounter = $state(false);
    const toggleFPSCounter = () => enableFPSCounter = !enableFPSCounter;

    const camera = new Camera({ eventEmitter, maxZoomLevel: 4, minZoomLevel: 0.5 });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter });
    const cursor = new Cursor({ eventEmitter });

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

    function setAppMode (mode: AppMode) {
        if (mode === "navigation") {
            selectedImageAsset = null;
            // Mouse
            mouse.mousePanning = true;
            mouse.momentum = true;
            // Cursor
            cursor.enablePainting = false;
            // Touch: re-enable gestures
            touch.setEnabled({ panning: true, pinch: true });
        }
        appMode = mode;
    };

    let hideWelcomeScreen = $state(false);

    // Attach the keyboard event listeners
    const keyboard = new Keyboard(keyboardOptions);
    keyboard.attach();

    const loadMapData = async (url: string): Promise<MapDataV2> => {
        const data = await loadJSON(url);
        if (!data) {
            throw new Error(`Failed to load map data from ${url}`);
        }
        const isVersionOne = Array.isArray(data);
        if (isVersionOne) {
            return { ground: data, version: 2, entities: [] };
        } else {
            return data;
        }
    };

    onMount(async () => {

        const { ground, entities } = await loadMapData('/maps/32x32.json');
        const imageAssets = await loadJSON('/imageAssetSets/1.json');

        /*
            NOTE - when we start to load games, they may use different asset 
            sets, so we need to design the code to be able to change image 
            asset sets if required.
        */
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
        const backgroundCanvas = document.getElementById('background') as HTMLCanvasElement;
        const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
        const cursorCanvas = document.getElementById('cursor') as HTMLCanvasElement;
        if (!mapCanvas || !cursorCanvas) {
            console.error('Canvas element for map or cursor not found');
            throw new Error('Canvas element for map or cursor not found');
        }

        gameMap = new GameMap({ background: backgroundCanvas, target: mapCanvas, cursorTarget: cursorCanvas, camera, ground, entities, imageAssetSet });

        // Attach the 
        touch.attach(cursorCanvas);
        mouse.attach(cursorCanvas);
        cursor.attach({ target: cursorCanvas, camera, gameMap });

        /* Resizes the canvas elements so that they always fit within the window */
        function resizeCanvases() {
            if (!gameMap) return;

            const W = gameMap.imageAssetSet.baseTileWidth;
            const H = gameMap.imageAssetSet.baseTileHeight;
            const Hmax = Math.max(
            ...gameMap.imageAssetSet.imageAssets.map(a => a.height ?? H)
            );

            // Full map bounding box in *world* pixels (zoom=1)
            backgroundCanvas.width  = Math.ceil((gameMap.rows + gameMap.columns) * W / 2);
            backgroundCanvas.height = Math.ceil((gameMap.rows + gameMap.columns) * H / 2 + (Hmax - H));

            // backgroundCanvas.width = gameMap.columns * imageAssetSet!.baseTileWidth;
            // backgroundCanvas.height = gameMap.rows * imageAssetSet!.baseTileHeight;
            const canvasElements = [mapCanvas, cursorCanvas];
            canvasElements.forEach(canvas => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            });
            gameMap.drawBackground();
            gameMap.draw();
        }

        /*
            Selects an image asset and toggles mouse panning and momentum as 
            we want to be able to apply a set of tiles by selecting multiple tiles  
        */
        function selectImageAsset (imageAsset: ImageAsset | null) {
            if (imageAsset && appMode === 'edit') {
                // Mouse
                mouse.mousePanning = false;
                mouse.momentum = false;

                // Cursor (painting)
                cursor.enablePainting = true;
                cursor.setPaintConstraint(imageAsset.paintConstraint);

                // Touch: disable 1-finger pan while editing; keep pinch if you like
                touch.setEnabled({ panning: false, pinch: true }); // or { panning: false, pinch: false }
            } else {
                // Mouse
                mouse.mousePanning = true;
                mouse.momentum = true;

                // Cursor
                cursor.enablePainting = false;

                // Touch: re-enable gestures
                touch.setEnabled({ panning: true, pinch: true });
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

        // This will be called when the camera is updated, so that we can 
        // redraw the camera, as well as update the cursor's selectedTile if 
        // needed
        function cameraUpdated() {
            if (!gameMap) return;
            gameMap.draw();
            cursor.calculatePositionOnMap();
            if (
                gameMap.selectedTile
            ) {
                if (inputDetector.shouldShowMouseSelector({})) {
                    gameMap.drawCursorAt(...gameMap.selectedTile);
                }
            }
        }

        // This is triggered when the user clicks on a tile
        function clickOnTile (tile: [number, number] | null) {
            if (tile && selectedImageAsset && gameMap) {
                // NOTE - change this so that it looks at the tile type (ground or entity)
                if (selectedImageAsset?.type === 'ground') {
                    if (Array.isArray(tile)) {
                        gameMap.ground[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                    } else {
                        gameMap.ground[tile] = [0, selectedImageAsset.code];
                    }
                } else {
                    gameMap.addEntity({ position: tile, imageAsset: selectedImageAsset });
                }
                gameMap.drawBackground();
                gameMap.draw();
            }
        }

        // This is triggered when the user clicks on a set of tiles
        function clickOnTiles (tiles: [number, number][]) {
            if (tiles.length === 0) return;
            if (selectedImageAsset && gameMap) {
                for (const tile of tiles) {
                    gameMap.ground[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                }
                gameMap.drawBackground();
                gameMap.draw();
            }
        }

        // This is used to draw a preview of where the selected tiles are
        function drawPreview(tiles: [number, number][]) {
            if (tiles.length === 0) return;
            if (selectedImageAsset && gameMap) {
                gameMap.drawPreview(tiles);
            }
        }

        // This clears the preview of the selected tiles
        function clearPreview () {
            if (gameMap) { gameMap?.clearPreview(); }
        }

        // Saves the game
        function saveGame (name:string) {
            if (gameMap) {
                gameName = name;
                const gameData = {
                    version: 2,
                    ground: gameMap.ground,
                    entities: gameMap.entities
                };
                gameManager.save(name, gameData);
                alert('Game saved!');
            }
        }

        // Loads the game
        function loadGame (name?:string) {
            if (!name) name = 'currentGame';
            gameName = name;
            const game = gameManager.load(name);
            if (game && gameMap) {
                if (Array.isArray(game.data)) {
                    gameMap.updateGround(game.data);
                    gameMap.updateEntities([]);
                } else {
                    // TODO - update entities
                    gameMap.updateGround(game.data.ground);
                    gameMap.updateEntities(game.data.entities);
                }
                gameMap.drawBackground();
                gameMap.draw();
            }
        }

        // Deletes a game
        function deleteGame (name:string) {
            if (confirm("Are you sure you want to delete this game?")) {
                gameManager.delete(name);
                alert('Game deleted!');
            }
        }

        /*
            If we attach/detach the iPad Pro from a magic keyboard, 
            we want to show/hide the cursor.
        */
        function showOrHideCursor() {
            if (inputDetector.shouldShowMouseSelector({excludeLastUsedPointer: true}) && gameMap?.selectedTile) {
                gameMap?.drawCursorAt(...(gameMap.selectedTile));
            } else {
                gameMap?.clearCursor();
            }
        }

        function showTheLoadModal() {
            showLoadModal = true;
        }

        function showTheSaveModal() {
            showSaveModal = true;
        }

        // EventEmitter bindings
        eventEmitter.on('startPanning', camera.startPanning);
        eventEmitter.on('stopPanning', camera.stopPanning);
        eventEmitter.on('pan', camera.addPan);
        eventEmitter.on('adjustZoom', adjustZoom);
        eventEmitter.on('zoomOut', camera.zoomOut);
        eventEmitter.on('zoomIn', camera.zoomIn);
        eventEmitter.on('resetZoom', camera.resetZoomWithSmoothing);
        eventEmitter.on('recenter', camera.resetPanWithSmoothing);
        eventEmitter.on('cameraUpdated', cameraUpdated);
        eventEmitter.on('selectImageAsset', selectImageAsset);
        eventEmitter.on('click', clickOnTile);
        eventEmitter.on('clickBatch', clickOnTiles);
        eventEmitter.on('drawPreview', drawPreview);
        eventEmitter.on('clearPreview', clearPreview);
        eventEmitter.on('setAppMode', setAppMode);
        eventEmitter.on('saveGame', saveGame);
        eventEmitter.on('loadGame', loadGame);
        eventEmitter.on('deleteGame', deleteGame);
        eventEmitter.on('toggleFPSCounter', toggleFPSCounter);
        eventEmitter.on('showLoadModal', showTheLoadModal);
        eventEmitter.on('showSaveModal', showTheSaveModal);
        eventEmitter.on("inputCapabilitiesChanged", showOrHideCursor);

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
        inputDetector.destroy();
    });
</script>

<style>
    #map, #cursor {
        position:absolute;
        top: 0px;
        left: 0px;
        cursor: move;
        width:100vw;
        height:100dvh;
    }

    #background {
        display: none;
    }
</style>

<main>
    <FPSCounter show={enableFPSCounter} />
    <div id="game">
        <canvas id="background"></canvas>
        <canvas id="map"></canvas>
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