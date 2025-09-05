<script lang="ts">

    import Load from "./Load.svelte";

    const { hide, gameManager, eventEmitter } = $props();

    type Screens = 'welcome' | 'load' | 'controls' | 'about';

    let currentScreen = $state('welcome');

    function loadScreen(screen: Screens) {
        currentScreen = screen;
    }

</script>

<style>
    #welcome-screen-background {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.1);
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
        background: rgba(0,0,0,0.03);
        backdrop-filter: blur(10px);
        border-radius: 10px;
    }

    #welcome-screen-options {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
    }

    img {
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

    #keyboard-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .keyboard-control {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin: 4px 0;
        width: 200px;
    }

    .key {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin-right: 8px;
        font-size: 12px;
        width: 25px;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .action {
        font-size: 12px;
        color: white;
    }

    #controls-guide {
       display: grid;
       grid-template-columns: 1fr 1fr;
       gap: 16px;
    }

    #mouse-controls p {
        font-size: 12px;
    }

    @media (max-width: 600px) {
        #keyboard-controls, #mouse-controls {
            display: none;
        }
    }

    a {
        color: white;
        text-decoration: underline;
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
        margin: 20px;
    }

</style>

<div id="welcome-screen-background">
    <div id="welcome-modal">
        {#if currentScreen==='welcome'}
                <img src="/img/logo.svg" alt="Babsland logo">
                <div id="welcome-screen-options">
                    <button onclick={hide}>Start</button>
                    <button onclick={() => loadScreen('load')}>Load Map</button>
                    <button onclick={() => loadScreen('controls')}>See Controls</button>
                    <button onclick={() => loadScreen('about')}>About</button>
                </div>
        {/if}
        {#if currentScreen==='load'}
            <Load {gameManager} {eventEmitter} {hide} back={() => loadScreen('welcome')}/>
        {/if}
        {#if currentScreen==='controls'}
            <div id="controls-guide">
                <div id="keyboard-controls">
                    <h2>
                        Keyboard
                    </h2>
                    <div class="keyboard-control">
                        <div class="key">&uparrow;</div>
                        <div class="action">Move Up</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">&downarrow;</div>
                        <div class="action">Move Down</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">&leftarrow;</div>
                        <div class="action">Move Left</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">&rightarrow;</div>
                        <div class="action">Move Right</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">+</div>
                        <div class="action">Zoom In</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">-</div>
                        <div class="action">Zoom Out</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">0</div>
                        <div class="action">Reset Zoom</div>
                    </div>
                    <div class="keyboard-control">
                        <div class="key">C</div>
                        <div class="action">Recenter</div>
                    </div>
                </div>
                <div id="mouse-controls">
                    <h2>
                        Mouse
                    </h2>
                    <h3>Navigation</h3>
                        <p><strong>Click and drag:</strong> Move around the map</p>
                        <p><strong>Scroll wheel:</strong> Zoom in / Zoom out</p>
                    <h3>Editor</h3>
                    <p>Click on items in the editor to select/deselect them</p>
                    <p>Then click on the map and drag to add them to the map</p>
                </div>
            </div>
            <button onclick={() => loadScreen('welcome')}>Back</button>
        {/if}
        {#if currentScreen==='about'}
            <h2>About Babsland</h2>

            <p>A game where you can create maps, and soon your own adventures!</p>
            <div id="warning">Warning: Work in Progress</div>
            <p>If you have any questions, email me at <a href="mailto:paulbjensen@gmail.com">paulbjensen@gmail.com</a></p>
            <button onclick={() => loadScreen('welcome')}>Back</button>
        {/if}
    </div>


</div>