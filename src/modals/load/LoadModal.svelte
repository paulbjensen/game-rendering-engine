<script lang="ts">
    const { hide, gameManager, eventEmitter } = $props();

    // TODO - maybe one day, refactor this so that it uses the same code as for the welcome screen
    function loadGame(name:string) {
        eventEmitter.emit('loadGame', name);
        hide();
    }
</script>

<style>

    #overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal {
        text-align: center;
        padding: 40px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        background: rgba(0,0,0,0.03);
        backdrop-filter: blur(10px);
        border-radius: 10px;
        color: white;
        font-family: Arial, Helvetica, sans-serif;
    }

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

<div id="overlay">
    <div class="modal" id="load-modal">
        <h2>Load Map</h2>
        {#if gameManager.games.length === 0}
            <p>No maps available</p>
        {:else}
            <p>Select a map to load:</p>
            <div id="map-list">
                {#each gameManager.games as game}
                    <div class="map-item">
                        <button class="saved-game" onclick={() => loadGame(game.name)}>{game.name}</button>
                        <button class="delete-game" onclick={() => { eventEmitter.emit('deleteGame', game.name); hide(); }}>❌</button>
                    </div>
                {/each}
            </div>
        {/if}
        <button onclick={hide}>Cancel</button>
    </div>
</div>
