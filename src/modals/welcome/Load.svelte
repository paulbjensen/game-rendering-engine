<script lang="ts">
    const { hide, back, gameManager, eventEmitter } = $props();

    function loadGame(name:string) {
        eventEmitter.emit('loadGame', name);
        hide();
    }
</script>

<style>
    #map-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 20px;
    }

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

    .saved-game {
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background 0.2s;
        font-size: 12px;
        font-weight: normal;
    }

    .saved-game:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .map-item {
        display: grid;
        grid-template-columns: 1fr 20px;
        gap: 8px;
    }

    button.delete-game, button.delete-game:hover {
        border: none;
        padding: none;
    }

</style>

<h2>Load Map</h2>
{#if gameManager.games.length === 0}
    <p>No maps available</p>
{:else}
    <p>Select a map to load:</p>
    <div id="map-list">
        {#each gameManager.games as game}
            <div class="map-item">
                <button class="saved-game" onclick={() => loadGame(game.name)}>{game.name}</button>
                <button class="delete-game" onclick={() => { eventEmitter.emit('deleteGame', game.name); back(); }}>❌</button>
            </div>
        {/each}
    </div>
{/if}
<button onclick={back}>Back</button>
