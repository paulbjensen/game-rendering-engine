<script lang="ts">
    const { appMode, eventEmitter } = $props();

    const directions = $state<string[]>([]);

    const toggleDirection = (direction: string) => {
        if (!directions.includes(direction)) {
            directions.push(direction);
            eventEmitter.emit('startPanning', direction);
        } else {
            directions.splice(directions.indexOf(direction), 1);
            eventEmitter.emit('stopPanning', direction);
        }
    };

    

</script>

<style>
    #topbar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto auto;
        gap: 8px;
        top: 20px;
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

    #zoom-bar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto auto auto;
        gap: 8px;
        bottom: 20px;
        right: 20px;
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

    #navigation-bar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto auto auto auto;
        gap: 8px;
        bottom: 70px;
        right: 20px;
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

    #recenter-bar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto;
        gap: 8px;
        bottom: 120px;
        right: 20px;
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

    #load-save-bar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        grid-template-columns: auto;
        gap: 8px;
        bottom: 180px;
        right: 20px;
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

{#if appMode === 'navigation'}
    <div id="recenter-bar">
        <button onclick={() => eventEmitter.emit('recenter')}>Recenter</button>
    </div>
    <div id="navigation-bar">
        <button class:selected={directions.includes('up')} onclick={() => toggleDirection('up')}>↑</button>
        <button class:selected={directions.includes('down')} onclick={() => toggleDirection('down')}>↓</button>
        <button class:selected={directions.includes('left')} onclick={() => toggleDirection('left')}>←</button>
        <button class:selected={directions.includes('right')} onclick={() => toggleDirection('right')}>→</button>
    </div>
    <div id="zoom-bar">
        <button onclick={() => eventEmitter.emit('zoomOut')}>-</button>
        <button onclick={() => eventEmitter.emit('resetZoom')}>Reset</button>
        <button onclick={() => eventEmitter.emit('zoomIn')}>+</button>
    </div>
    <div id="load-save-bar">
        <button onclick={() => eventEmitter.emit('showSaveModal')}>Save</button>
        <button onclick={() => eventEmitter.emit('showLoadModal')}>Load</button>
    </div>
{/if}