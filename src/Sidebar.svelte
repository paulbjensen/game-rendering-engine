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

    // --- Helpers to compute a preview frame from a spritesheet ---
    type FrameRect = { x: number; y: number; w: number; h: number };

    function getPreviewFrame(imageAsset: ImageAsset): FrameRect | null {
        const s: any = (imageAsset as any).sprite;
        if (!s) return null;

        if (s.mode === 'rects' && Array.isArray(s.rects) && s.rects.length > 0) {
            const r = s.rects[0];
            return { x: r.x, y: r.y, w: r.w, h: r.h };
        }

        if (s.mode === 'grid' && Array.isArray(s.frameSize)) {
            const [fw, fh] = s.frameSize;
            const cols: number = s.grid?.cols ?? 1;
            // frameIndex = 0 (first frame)
            const col = 0 % cols;
            const row = Math.floor(0 / cols);
            return { x: col * fw, y: row * fh, w: fw, h: fh };
        }

        return null;
    }

    function spriteThumbStyle(imageAsset: ImageAsset) {
        const frame = getPreviewFrame(imageAsset);
        if (!frame) return '';

        const { x, y, w, h } = frame;
        // Native-size preview: container is exactly frame size
        // Use background-position to “crop” the desired frame out of the big sheet.
        return `
            width: ${w}px;
            height: ${h}px;
            background-image: url(${imageAsset.imageUrl});
            background-position: -${x}px -${y}px;
            background-repeat: no-repeat;
        `;
    }

    function isSprite(imageAsset: ImageAsset) {
        return !!(imageAsset as any).sprite;
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
        align-items: start; /* accommodate taller sprites gracefully */
    }

    .section-content button {
        background: none;
        padding: 4px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        /* Let the button expand vertically if the frame is tall (e.g., 128px) */
    }

    .section-content button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .section-content button.selected {
        background: rgba(255, 255, 255, 0.1);
        border: solid 1px #00ffff;
        box-shadow: 0 0 10px #00ffff;
    }

    /* Ensure pixel-art <img> also looks crisp */
    .thumb-img {
        image-rendering: pixelated;
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
                            title={imageAsset.name}
                        >
                            {#if isSprite(imageAsset)}
                                <!-- Sprite preview: show frame 0 -->
                                <div class="sprite-thumb" style={spriteThumbStyle(imageAsset)}></div>
                            {:else}
                                <!-- Static image fallback -->
                                <img class="thumb-img" src={imageAsset.imageUrl} alt={imageAsset.name} width="64" />
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>