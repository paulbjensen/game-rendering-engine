<script lang="ts">
    let { hide, gameManager, eventEmitter, gameName } = $props();

    function saveGame(event?: Event) {
        event?.preventDefault();
        eventEmitter.emit('saveGame', gameName);
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
        padding: 20px 40px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        background: rgba(0,0,0,0.03);
        backdrop-filter: blur(10px);
        border-radius: 10px;
        color: white;
        font-family: Arial, Helvetica, sans-serif;
        display: flex;
        flex-direction: column;
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

    form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        margin-bottom: 12px;
    }

    input[type="text"] {
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        background: white;
        color: black;
        font-size: 16px;
    }

</style>

<div id="overlay">
    <div class="modal" id="load-modal">
        <h2>Save</h2>
        <p>Click below to save as that map name</p>
        <div id="map-list">
            {#each gameManager.games as game}
                <button class="saved-game" onclick={() => {gameName = game.name; saveGame(); }}>{game.name}</button>
            {/each}
        </div>
        <p>Or give it a new name</p>
        <form onsubmit={saveGame} method="post">
            <input
                type="text"
                placeholder="Save as"
                bind:value={gameName}
                required
            />
            <button type="submit">Save</button>
        </form>
        <button onclick={hide}>Cancel</button>
    </div>
</div>
