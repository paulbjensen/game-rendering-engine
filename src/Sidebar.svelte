<script lang="ts">
    import type { ImageAsset } from './types';

    const { sections, imageAssetSet, eventEmitter, selectedImageAsset, hidden } = $props();
    
    function toggleImageAsset(imageAsset: ImageAsset) {
        return () => {
            const isSelected = imageAsset.code === selectedImageAsset?.code;
            const valueToSend = isSelected ? null : imageAsset;
            eventEmitter.emit('selectImageAsset', valueToSend);
        };
    }

    // Filters assets by section
    function filterBySection (section: { title: string; subType: string }) {
        return (imageAsset: ImageAsset) => {
            return imageAsset.subType === section.subType;
        }
    }
</script>

<style>
    #sidebar {
        font-family: Arial, Helvetica, sans-serif;
        position: absolute;
        top: 60px;
        left: 20px;
        width: 230px;
        min-height: inherit;
        max-height: calc(100dvh - 140px);
        display: grid;
        background: rgba(0,0,0,0.1);
        color: white;
        padding: 16px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        backdrop-filter: blur(10px);
        grid-template-rows: 20px auto;
        overflow: auto;
    }

    #sections {
        overflow-y: scroll;
    }

    #sidebar.hidden {
        display: none;
    }

    .title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 12px;
        text-transform: uppercase;
        text-align: center;
        text-shadow: 0 0 5px rgba(0,0,0,0.3);
    }

    .section-title {
        margin-top: 16px;
        border-top: solid 1px rgba(255, 255, 255, 0.3);
        padding-top: 8px;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 12px;
        text-transform: uppercase;
        text-align: center;
        text-shadow: 0 0 5px rgba(0,0,0,0.3);
    }

    .section-content {
        display: grid;
        grid-template-columns: repeat(3, 74px);
        gap: 4px;
    }

    .section-content button {
        background: none;
        padding: 4px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        border-radius: 4px;
    }

    .section-content button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .section-content button.selected {
        background: rgba(255, 255, 255, 0.1);
        border: solid 1px #00ffff;
        box-shadow: 0 0 10px #00ffff;
    }
</style>

<div id="sidebar" class:hidden={hidden}>
    <div class="title">Editor</div>
    <div id="sections">
        {#each sections as section}
            <div class="section">
                <div class="section-title">{section.title}</div>
                <div class="section-content">
                    {#each imageAssetSet.imageAssets.filter(filterBySection(section)) as imageAsset}
                        <button 
                            type="button"
                            onclick={toggleImageAsset(imageAsset)}
                            class={selectedImageAsset?.code === imageAsset.code ? 'selected' : ''}
                        >
                            <img src={imageAsset.imageUrl} alt={imageAsset.name} width="64" />
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>