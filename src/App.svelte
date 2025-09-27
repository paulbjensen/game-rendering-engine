<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import eventEmitter from './eventEmitter';
    import Camera from './Camera';
    import Keyboard from './controls/keyboard/Keyboard';
    import Touch from './controls/Touch';
    import Mouse from './controls/Mouse';
    import Cursor from './controls/cursor/Cursor';
    import GameMap from './GameMap';
    import type { AppMode, Entity, MapDataV2, ImageAsset, ImageAssetSetOption } from './types';
    import { loadJSON, loadMapData } from './utils';
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
    import History from './lib/history/History';
    
    // Used to toggle the FPSCounter component via keyboard controls
    let enableFPSCounter = $state(false);
    const toggleFPSCounter = () => enableFPSCounter = !enableFPSCounter;

    // These are settings that can be adjusted later, or configured for a specific game
    const settings = {
        camera: {
            maxZoomLevel: 4,
            minZoomLevel: 0.25,
            enableEdgeScrolling: true
        },
        mouse: {
            scrollAtEdges: false // Turned this off because it was sort of annoying when you wanted to move your mouse out of the window - perhaps a delay of say 500ms-1000ms would help?
        }
    }

    // Setup instances of the camera, touch, mouse and cusror classes for the game map
    const camera = new Camera({ eventEmitter, ...settings.camera });
    const touch = new Touch({ eventEmitter });
    const mouse = new Mouse({ eventEmitter, ...settings.mouse });
    const cursor = new Cursor({ eventEmitter });

    // Create an instance of the History class to manage the undo/redo of map changes
    let mapEventHistory = new History();

    // Setup an instance of the GameManager class to handle saving/loading/deleting games
    const gameManager = new GameManager();

    // NOTE - in the future, we want to be able to load these from an API
    // and users who pay for the game can have access to more asset sets
    const imageAssetSets: ImageAssetSetOption[] = [
        { name: 'One', url: '/imageAssetSets/1.json', maxRows: 256, maxColumns: 256 },
        { name: 'Two', url: '/imageAssetSets/2.json', maxRows: 256, maxColumns: 256 },
        { name: 'Three', url: '/imageAssetSets/3.json', maxRows: 128, maxColumns: 128 },
    ];

    // Some initial state setting for the map editor
    let gameMap: GameMap | null = null;
    let imageAssetSet: ImageAssetSet | null = $state(null);
    let selectedImageAsset: ImageAsset | null = $state(null);
    let appMode: AppMode = $state('modal');
    let gameName: string = $state('currentGame');
    let sections = $state<{ title: string; subType: string }[]>([]);

    // We will load the 1st image asset set by default
    let imageAssetSetUrl = $state(imageAssetSets[0].url);

    // Toggles showing/hiding the load modal
    let showLoadModal = $state(false);
    
    // Toggles showing/hiding the save modal
    let showSaveModal = $state(false);

    // A helper function that will re-enable navigation interactions and disable editing interactions
    function setAppMode (mode: AppMode) {
        if (mode === "navigation") {
            // TODO - find better way to manage this state in the future
            cursor.selectedImageAsset = selectedImageAsset = null;
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

    // Used to toggle showing/hiding the welcome screen
    let hideWelcomeScreen = $state(false);

    // Attach the keyboard event listeners
    const keyboard = new Keyboard(keyboardOptions);
    // TODO - move this to a place where we do it when starting a game, or loading a map
    // and disable it when showing a modal
    keyboard.attach();
    keyboard.pauseListening = true;

    function generateNewMap({numRows, numColumns}: {numRows: number; numColumns: number}) {
        const columns = new Array(numColumns).fill(0);
        const ground = new Array(numRows).fill(0).map(() => [...columns]);
        const entities:Entity[] = [];
        return { ground, entities };
    }


    // When the page is loaded, we call the mount function
    onMount(async () => {

        // We load the the ground and entities from a JSON file - it's mostly empty green land - in fact, we could just generate this on the fly and save a HTTP request
        const { ground, entities } = generateNewMap({ numRows: 128, numColumns: 128 });
        // We load an image asset set to render the map with
        const { imageAssetTypes, baseTileWidth, baseTileHeight, imageAssets } = await loadJSON('/imageAssetSets/1.json');

        // Sections are used by the sidebar to group image assets for adding to the map
        sections = imageAssetTypes;

        /*
            This loads the image assets for the game, which includes
            the base tile width and height, as well as the individual
            image assets that can be used in the game.
        */
        imageAssetSet = new ImageAssetSet({
            imageAssets,
            baseTileWidth,
            baseTileHeight
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

        // Create an instance of the GameMap class to manage the map rendering and interactions
        gameMap = new GameMap({ background: backgroundCanvas, target: mapCanvas, cursorTarget: cursorCanvas, camera, ground, entities, imageAssetSet });

        // Attach the touch, mouse, and cursor controls to the cursor canvas
        // Also pass the camera and gameMap instances to the cursor
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

            // We resize the map and cursor canvases to be the width and height of the window
            // We don't include the background canvas because it serves the purpose of being a full rendering of the map which we extract a sample from
            const canvasElements = [mapCanvas, cursorCanvas];
            canvasElements.forEach(canvas => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            });
            // We redraw the background and map once resized 
            // Question - do we need to redraw the background every time - or just once before the start?
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

                // Cursor - disable painting
                cursor.enablePainting = false;

                // Touch: re-enable gestures
                touch.setEnabled({ panning: true, pinch: true });
            }

            cursor.selectedImageAsset = selectedImageAsset = imageAsset;
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

        // This is called when the camera is updated, so that we can 
        // redraw the camera, as well as update the cursor's selectedTile if 
        // needed
        function cameraUpdated() {
            if (!gameMap) return;
            cursor.calculatePositionOnMap();
            if (
                gameMap.selectedTile
            ) {
                if (inputDetector.shouldShowMouseSelector({})) {
                    gameMap.drawCursorAt(...gameMap.selectedTile, selectedImageAsset);
                }
            }
        }

        // This is triggered when the user clicks on a set of tiles
        function clickOnTiles (tiles: [number, number][]) {
            if (tiles.length === 0) return;
            if (selectedImageAsset && gameMap) {                
                /*
                    NOTE - implementing full copy for now, will later 
                    implement a more memory-efficient snapshot approach later,
                    especially with potentially larger maps in the future
                */
                const before = {
                    ground: structuredClone(gameMap.ground),
                    /*
                        We can't use structuredClone here as the entities are class instances,
                        but interestingly it does make a copy of the state before the change,
                        rather than pointing to a reference of the value.
                    */
                    entities: gameMap.entities
                };

                /*
                    If an image asset has a stack property set to true, then we allow
                    it to be placed on top of other entities, rather than clearing them.

                    This is used by the map editor when placing entities on top of other entities,
                    like cars on top of roads. 
                */
                if (!selectedImageAsset.stack) {
                    gameMap.clearEntitiesInArea([...tiles[0], ...tiles[tiles.length - 1]]);
                }
                const rows = tiles.map(t => t[0]);
                const columns = tiles.map(t => t[1]);
                const minRow = Math.min(...rows);
                const maxRow = Math.max(...rows);
                const minCol = Math.min(...columns);
                const maxCol = Math.max(...columns);

                const topLeftTile:[number, number] = [minRow, minCol];
                const topRightTile:[number, number] = [minRow, maxCol];
                const bottomLeftTile:[number, number] = [maxRow, minCol];
                const bottomRightTile:[number, number] = [maxRow, maxCol];
                const tilesToCheck = [topLeftTile, topRightTile, bottomLeftTile, bottomRightTile];

                /*
                    We check that for multi-tile assets, all of the tiles fit on the map 
                    (so that you cannot place them outside of the map boundaries).
                */
                for (const tileToCheck of tilesToCheck) {
                    if (!gameMap.fitsOnMap({ position: tileToCheck, imageAsset: selectedImageAsset })) return;
                }

                /*
                    This logic checks whether we are placing a ground or entity asset,
                    and then applies some logic to it accordingly.

                    At the moment, ground assets are assumed to be single-tile assets,
                    and that they will always be placed on top of a ground layer.

                    NOTE - might be a good idea to be able to use the stack property
                    for ground assets that we want to place (e.g. water corner on sand for example)
                */
                for (const tile of tiles) {
                    if (selectedImageAsset?.type === 'ground') {
                        gameMap.ground[tile[0]][tile[1]] = [0, selectedImageAsset.code];
                    } else {
                        gameMap.addEntity({ position: tile, imageAsset: selectedImageAsset });
                    }
                }

                // We take a copy of the changes afterwards
                const after = {
                    ground: gameMap.ground,
                    entities: gameMap.entities
                };

                // We then add the before/after states to the history for undo/redo support
                mapEventHistory.addEvent({
                    type: 'clickBatch',
                    before,
                    after
                });

                // We then redraw the background and map
                gameMap.drawBackground();
                gameMap.draw();
            }
        }

        // This is used to draw a preview of where the selected tiles are placed on the map 
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
                    entities: gameMap.entities,
                    imageAssetSetUrl,
                    panX: camera.panX,
                    panY: camera.panY,
                    zoomLevel: camera.zoomLevel
                };
                gameManager.save(name, gameData);
                alert('Game saved!');
            }
        }

        // Loads the game
        async function loadGame (name?:string) {
            if (!name) name = 'currentGame';
            gameName = name;
            const game = gameManager.load(name);
            if (game && gameMap) {
                if (Array.isArray(game.data)) {
                    console.log('Loading version 1 map data');
                    gameMap.updateEntities([]);
                    gameMap.drawBackground();
                    gameMap.draw();
                } else {
                    console.log('Loading version 2 map data');
                    gameMap.updateGround(game.data.ground);
                    gameMap.updateEntities(game.data.entities);
                    imageAssetSetUrl = game.data.imageAssetSetUrl;


                    // We loads the image asset set for the saved game, or fallback to the default image asset set if not found
                    const { imageAssetTypes, baseTileWidth, baseTileHeight, imageAssets } = await loadJSON(game.data.imageAssetSetUrl || imageAssetSets[0].url);

                    // Update the image asset set for the game map instance
                    gameMap.imageAssetSet = imageAssetSet = new ImageAssetSet({
                        imageAssets: imageAssets,
                        baseTileWidth: baseTileWidth,
                        baseTileHeight: baseTileHeight
                    });

                    /*
                        We then load the game map along with the new image 
                        asset set, and then redraw the background and map 
                        afterwards.
                    */
                    (async () => {
                        await gameMap.load();
                        gameMap.drawBackground();
                        gameMap.draw();
                    })();
                    sections = imageAssetTypes;
                }
            }

            /*
                We load the camera settings from the saved game, 
                or use defaults if no saved camera settings were found

                And then apply that to the camera. This is so that players can
                pick up from where they left off. 
            */
            const { panX, panY, zoomLevel } = game.data as MapDataV2;
            if (panX && panY && zoomLevel) {
                camera.panX = panX;
                camera.panY = panY;
                camera.zoomLevel = zoomLevel;
            } else {
                camera.panX = 0;
                camera.panY = 0;
                camera.zoomLevel = 1;
            }

            /*
                We re-enable keyboard listening, 
                set the app mode to navigation, 
                and reset the map event history.
            */
            keyboard.pauseListening = false;
            appMode = 'navigation';
            mapEventHistory = new History();

        }

        // Deletes a game
        function deleteGame (name:string) {
            if (confirm("Are you sure you want to delete this game?")) {
                gameManager.delete(name);
                alert('Game deleted!');
            }
        }

        // Creates a new game from the welcome screen
        function newGame (data: { name: string; imageAssetSetUrl: string; mapRows: number; mapColumns: number }) {
            gameName = data.name;
            (async () => {
                imageAssetSetUrl = data.imageAssetSetUrl;
                const { imageAssetTypes, baseTileWidth, baseTileHeight, imageAssets } = await loadJSON(data.imageAssetSetUrl);
                sections = imageAssetTypes;
                if (gameMap) {

                    const { ground, entities } = generateNewMap({ numRows: data.mapRows, numColumns: data.mapColumns });

                    gameMap.ground = ground;
                    gameMap.updateGround(ground);
                    gameMap.updateEntities(entities);
                    gameMap.imageAssetSet = imageAssetSet = new ImageAssetSet({
                        imageAssets,
                        baseTileWidth,
                        baseTileHeight
                    });
                    gameMap.rows = data.mapRows;
                    gameMap.columns = data.mapColumns;
                    await gameMap.load();
                    resizeCanvases();
                    // These calls below are redundant as they are called in resizeCanvases
                    // gameMap.drawBackground();
                    // gameMap.draw();
                }
            })();
            keyboard.pauseListening = false;
            mapEventHistory = new History();
            appMode = 'navigation';
        };

        /*
            If we attach/detach the iPad Pro from a magic keyboard, 
            then we we want to show/hide the cursor.
        */
        function showOrHideCursor() {
            if (inputDetector.shouldShowMouseSelector({excludeLastUsedPointer: true}) && gameMap?.selectedTile) {
                gameMap?.drawCursorAt(...(gameMap.selectedTile), selectedImageAsset);
            } else {
                gameMap?.clearCursor();
            }
        }

        /*
            NOTE - I think that we will want to revisit how we toggle loading 
            modals as the code for each modal looks like it could be DRYed up.
        */
        function showTheLoadModal() {
            showLoadModal = true;
        }

        /* Same as above */
        function showTheSaveModal() {
            showSaveModal = true;
        }

        /* This handles performing an undo function */
        function undo() {
            const event = mapEventHistory.undo();
            if (event && gameMap) {
                if (event.before.ground) {
                    gameMap.updateGround(event.before.ground);
                }
                if (event.before.entities) {
                    gameMap.updateEntities(event.before.entities);
                }

                // NOTE - maybe we DRY up the 2 calls into 1 function call?
                gameMap.drawBackground();
                gameMap.draw();
            }
        }

        /*
            This handles performing an undo function

            NOTE - This looks like it could be DRYed up with the undo function above
        */
        function redo() {
            const event = mapEventHistory.redo();
            if (event && gameMap) {
                if (event.after.ground) {
                    gameMap.updateGround(event.after.ground);
                }
                if (event.after.entities) {
                    gameMap.updateEntities(event.after.entities);
                }
                // NOTE - maybe we DRY up the 2 calls into 1 function call?
                gameMap.drawBackground();
                gameMap.draw();
            }
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
        eventEmitter.on('clickBatch', clickOnTiles);
        eventEmitter.on('drawPreview', drawPreview);
        eventEmitter.on('clearPreview', clearPreview);
        eventEmitter.on('setAppMode', setAppMode);
        eventEmitter.on('saveGame', saveGame);
        eventEmitter.on('loadGame', loadGame);
        eventEmitter.on('newGame', newGame);
        eventEmitter.on('deleteGame', deleteGame);
        eventEmitter.on('toggleFPSCounter', toggleFPSCounter);
        eventEmitter.on('showLoadModal', showTheLoadModal);
        eventEmitter.on('showSaveModal', showTheSaveModal);
        eventEmitter.on("inputCapabilitiesChanged", showOrHideCursor);
        eventEmitter.on('undo', undo);
        eventEmitter.on('redo', redo);


        // Load map assets then resize the canvas once loaded
        await gameMap?.load();
        resizeCanvases();

        // This handles the animation frame rendering loop
        let rafId = 0;
        function tick(now: number) {
            gameMap?.renderFrame(now);
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

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
        <Sidebar {sections} {imageAssetSet} {eventEmitter} {selectedImageAsset} hidden={appMode !== "edit"} />
    {/if}
    <TopBar {appMode} {eventEmitter} hidden={appMode === 'modal'} />
    {#if !hideWelcomeScreen}
        <WelcomeScreen {gameManager} {imageAssetSets} {eventEmitter} hide={() => hideWelcomeScreen = true} />
    {/if}
    {#if showLoadModal}
        <LoadModal {gameManager} {eventEmitter} hide={() => showLoadModal = false} />
    {/if}
    {#if showSaveModal}
        <SaveModal {gameManager} {eventEmitter} {gameName} hide={() => showSaveModal = false} />
    {/if}
</main>
