<script lang="ts">
    const { onClick } = $props();
</script>

<style>
    #welcome-screen-background {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        font-family: Arial, Helvetica, sans-serif;
    }

    #welcome-modal {
        text-align: center;
        padding: 40px;
        border: solid 1px rgba(255, 255, 255, 0.3);
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(10px);
        border-radius: 10px;
    }

    button {
        margin: 20px 20px;
        background: transparent;
        border: solid 1px rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 8px 16px 10px;
        border-radius: 8px;
    }

    button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    ul {
        font-size: 12px;
    }

    #warning {
        background: repeating-linear-gradient(
            135deg,
            rgb(255, 221, 0),
            rgb(255, 221, 0) 10px,
            black 10px,
            black 20px
        );
        color: white;
        text-shadow: 0px 0px 2px black, 0px 0px 10px black;
        font-weight: bold;
        padding: 8px 4px;
        border-radius: 4px;
        text-transform: uppercase;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
    }
</style>

<div id="welcome-screen-background">
    <div id="welcome-modal">
        <h1>Welcome to Babsland</h1>
        <p>Create your own maps, and soon your own adventures!</p>
        <div id="warning">Warning: Work in Progress</div>
        <h2>
            Keyboard controls:
        </h2>

            <ul>
                <li><strong>Arrow keys:</strong> Pan the map</li>
                <li><strong>+</strong> / <strong>-</strong>: Zoom in/out</li>
                <li><strong>0</strong>: Reset zoom</li>
                <li><strong>C</strong>: Recenter the view</li>
            </ul>
        <h2>
            Mouse controls:
        </h2>
        <ul>
            <li><strong>Click and drag:</strong> Pan the map</li>
            <li><strong>Scroll wheel:</strong> Zoom in/out</li>

        </ul>

        <div>
            <button onclick={onClick}>Start</button>
        </div>
    </div>

</div>