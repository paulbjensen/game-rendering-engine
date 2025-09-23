<script lang="ts">
    const { hide, back, eventEmitter, imageAssetSets } = $props();


    // This feels like config that would be loaded from somewhere else
    let name = $state('My Map');
    let selectedImageAssetSet = $state(imageAssetSets[0].url);

    let mapRows = $state(128);
    let mapColumns = $state(128);

    function newGame() {
        eventEmitter.emit('newGame', { name, imageAssetSetUrl: selectedImageAssetSet, mapRows, mapColumns });
        hide();
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
    <select id="image-asset-set" bind:value={selectedImageAssetSet}>
        {#each imageAssetSets as imageAssetSet}
            <option value={imageAssetSet.url}>{imageAssetSet.name}</option>
        {/each}
    </select>
    <label for="map-rows">Rows:</label>
    <input id="map-rows" type="number" min="1" max="128" bind:value={mapRows} />
    <label for="map-columns">Columns:</label>
    <input id="map-columns" type="number" min="1" max="128" bind:value={mapColumns} />
    <button type="button" onclick={newGame}>Start</button>
</form>
<button onclick={back}>Back</button>
