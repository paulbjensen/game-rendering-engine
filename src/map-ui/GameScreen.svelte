<script lang="ts">
    /*
        This component is responsible for rendering the game screen, including the map and cursor.
        It uses three canvas elements: 
        
        ## background 
        
        This is a full-map render of the entire game map, rendered once and then hidden.
        
        ## map 

        This is the main canvas where the visible portion of the map is rendered, according to the browser window's size and the camera's pan and zoom settings.

        ## cursor

        This is the canvas where the cursor selection is rendered, and covers the entire browser window.
    */
</script>
<style>
    #map, #cursor {
        position:absolute;
        top: 0px;
        left: 0px;
        cursor: move;
        width:100vw;
        height:100dvh;
    }

    /* We hide the background canvas as it is used for an offscreen drawing context*/
    #background {
        display: none;
    }
</style>

<div id="game">
    <canvas id="background"></canvas>
    <canvas id="map"></canvas>
    <canvas id="cursor"></canvas>
</div>