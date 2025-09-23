<script lang="ts">
    const { appMode, eventEmitter, hidden } = $props();

    function toggleEditMode() {
        const newMode = appMode === 'navigation' ? 'edit' : 'navigation';
        eventEmitter.emit('setAppMode', newMode);
    }

</script>

<style>
    #topbar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        gap: 8px;
        top: 0px;
        left: 0px;
        width: 100vw;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.1);
        color: white;
        padding: 8px;
        border-bottom: solid 1px rgba(255, 255, 255, 0.3);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
    }

    button {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
    }

    button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    button.selected {
        background: rgba(255, 255, 255, 0.2);
    }

    .divider {
        color: rgba(255, 255, 255, 0.3);
        user-select: none;
        margin: 0px 4px;
    }
</style>

{#if !hidden}
    <div id="topbar">
        <button onclick={() => eventEmitter.emit('showLoadModal')}>Load</button>
        <button onclick={() => eventEmitter.emit('showSaveModal')}>Save</button>
        <div class="divider">|</div>
        <button class:selected={appMode === 'edit'} onclick={toggleEditMode}>Editor</button>
        <div class="divider">|</div>
        <button onclick={() => eventEmitter.emit('recenter')}>Recenter</button>
        <div class="divider">|</div>
        <button onclick={() => eventEmitter.emit('zoomOut')}>-</button>
        <button onclick={() => eventEmitter.emit('resetZoom')}>Reset</button>
        <button onclick={() => eventEmitter.emit('zoomIn')}>+</button>
    </div>
{/if}