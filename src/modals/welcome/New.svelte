<script lang="ts">
    import type { ImageAssetSetOption } from '../../types';
    const { hide, back, eventEmitter, imageAssetSets } = $props();
    import MaxCanvasSize from '../../lib/maxCanvasSize/MaxCanvasSize';

    // We start with what should be a safe default for the maximum
    // number of tiles we can support on most devices, before we 
    // then detect the max canvas size and adjust accordingly.
    const DEFAULT_MAX_TILES = 64;
   
    // The default tile width we use to calculate the max rows and 
    // columns, before we then load it from the selected image asset set.
    const baseTileWidth = 64;

    // This is used to determine the maximum canvas size we can support
    // on this device, and then we use that to determine the maximum
    // number of rows and columns we can support for the map, based
    // on that maximum size, as well as the tile size of the selected 
    // image asset set.
    const maxCanvasSize = new MaxCanvasSize();

    // First thing we do is see if we have a previous run stored
    // in localStorage, and if so, we use that to set the max rows
    // and columns.
    let previousMaxCanvasSize = maxCanvasSize.findPreviousRun();

    // We store the max rows and columns as state, so that
    // when they change, the UI updates accordingly.
    let maxRows = $state(DEFAULT_MAX_TILES);
    let maxColumns = $state(DEFAULT_MAX_TILES);

    // We store the map rows and columns as state, as the user
    // adjusts them via the range inputs.
    let mapRows = $state(DEFAULT_MAX_TILES);
    let mapColumns = $state(DEFAULT_MAX_TILES);

    // If we don't have a previous run, or it didn't complete, 
    // we run the test to determine the maximum canvas size, 
    // and then use that to set the max rows and columns.
    if (!previousMaxCanvasSize?.completed) {

        // We add a hook so that when the maxCanvasSize detects a 
        // successful test, we can use that to set the max rows
        // and columns temporarily, and then update as more
        // successful tests detect larger possible sizes.
        maxCanvasSize.hooks.afterStoreRun.push(() => {
            previousMaxCanvasSize = maxCanvasSize.findPreviousRun();
            maxRows = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.height / baseTileWidth) : DEFAULT_MAX_TILES;
            maxColumns = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.width / baseTileWidth) : DEFAULT_MAX_TILES;
        });

        // We kick off the test, starting with a 4096x4096 canvas size, 
        // which should be good for most devices/browsers.
        // It will then increase the size until it finds the maximum.
        maxCanvasSize.runTest({
            testNumber: 4096,
            successfulTest: 0,
            failedTest: 0,
        });
    } else {
        // We have a previous completed run, so we use that to set the max rows and columns.
        maxRows = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.height / baseTileWidth) : DEFAULT_MAX_TILES;
        maxColumns = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.width / baseTileWidth) : DEFAULT_MAX_TILES;
    }

    // NOTE - This feels like config that would be loaded from somewhere else
    let name = $state('My Map');

    // This is used to track the selected image asset set in the dropdown
    let selectedImageAssetSet = $state(imageAssetSets[0].url);

    // This function is called when the user clicks the "Start" button
    // to create a new game with the specified name, image asset set,
    // number of rows, and number of columns.
    function newGame() {
        eventEmitter.emit('newGame', { name, imageAssetSetUrl: selectedImageAssetSet, mapRows, mapColumns });
        hide();
    }

    // This function is called when the user changes the selected
    // image asset set in the dropdown. It updates the max rows and
    // columns based on the base tile width of the selected set.
    function updateMaxRowAndColumnSizes() {
        const imageAssetSet = imageAssetSets.find((ias: ImageAssetSetOption) => ias.url === selectedImageAssetSet);
        if (imageAssetSet) {
            const newBaseTileWidth = imageAssetSet.baseTileWidth;
            maxRows = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.height / newBaseTileWidth) : DEFAULT_MAX_TILES;
            maxColumns = previousMaxCanvasSize ? Math.floor(previousMaxCanvasSize.width / newBaseTileWidth) : DEFAULT_MAX_TILES;
            if (mapRows > maxRows) mapRows = maxRows;
            if (mapColumns > maxColumns) mapColumns = maxColumns;
        }
    }
</script>

<style>
    button {
        background: transparent;
        border: solid 1px rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 8px 16px 10px;
        border-radius: 8px;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0,0,0,0.3);
    }

    button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    form {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 20px;
    }
</style>

<h2>New Map</h2>
<form>
    <label for="map-name">Map Name:</label>
    <input id="map-name" type="text" bind:value={name} />
    <label for="image-asset-set">Tileset:</label>
    <select id="image-asset-set" bind:value={selectedImageAssetSet} onchange={updateMaxRowAndColumnSizes}>
        {#each imageAssetSets as imageAssetSet}
            <option value={imageAssetSet.url}>{imageAssetSet.name}</option>
        {/each}
    </select>
    <label for="map-rows">Rows: {mapRows}</label>
    <input id="map-rows" type="range" min="1" max={maxRows} bind:value={mapRows} />
    <label for="map-columns">Columns: {mapColumns}</label>
    <input id="map-columns" type="range" min="1" max={maxColumns} bind:value={mapColumns} />
    <button type="button" onclick={newGame}>Start</button>
</form>
<button onclick={back}>Back</button>
