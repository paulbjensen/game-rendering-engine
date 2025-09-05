<script lang="ts">
    import { fps } from "@sveu/browser"
    const fpsResult = fps();
    const { show } = $props();
</script>

<style>
    #fps-count {
        position: absolute;
        z-index: 3;
        top: 20px;
        right: 20px;
        border: solid 1px rgba(255,255,255,0.2);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
        padding: 8px;
        border-radius: 8px;
        background: rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        color: white;
        font-family:Arial, Helvetica, sans-serif;
        text-transform: uppercase;
        font-weight: bold;
    }
</style>

{#if show}
    <div id="fps-count">{$fpsResult} fps</div>
{/if}
