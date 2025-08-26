<script lang="ts">
    const { appMode, eventEmitter } = $props();
</script>

<style>
    #topbar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto auto;
        gap: 8px;
        top: 40px;
        left: calc(50% - 94px);
        width: 140px;
        display: grid;
        background: rgba(0,0,0,0.1);
        color: white;
        padding: 8px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
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
</style>

<div id="topbar">
    <button class:selected={appMode === 'navigation'} onclick={() => eventEmitter.emit('setAppMode', 'navigation')}>Navigation</button>
    <button class:selected={appMode === 'edit'} onclick={() => eventEmitter.emit('setAppMode', 'edit')}>Editor</button>
</div>