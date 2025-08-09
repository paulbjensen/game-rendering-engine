/*
    Create an isometric tile map in the game world using HTML5 canvas.

    This is fun but will it handle everything that is needed, 
    especially characters and clicking on objects?

    This might be where React Three Fiber really begins to shine.
    It will be interesting to see how the performance compares between 
    the two approaches.
*/

/*
    We define the map dimensions here to help with drawing 
    the map onto the canvas
*/
const mapWidth = 15;
const mapHeight = 15;

/*
    NOTE - these should be the default tile width and height values, 
    that are used for standard tiles. Any tiles which have different
    dimensions should be specified with that.
*/
const BASE_TILE_WIDTH = 64;
const BASE_TILE_HEIGHT = 32;

// Set the aspect ratio for the canvas
const aspectRatio = 2; // Adjust this value as needed

/*
    A helper function to load images in the browser without needing
    to render them in the page yet
*/
const loadImage = (src) => {
    const image = new Image();
    image.src = src;
    return image;
};

/*
    This will be where we store the tileset images, and then we can use
    the code to reference the correct image, as well as lookup the tile size.
*/
const tilesLibrary = [
    { code: 0, name: 'grass', image: loadImage('img/grass.png'), width: 64, height: 32 },
    { code: 1, name: 'road', image: loadImage('img/road.png'), width: 64, height: 32 },
    { code: 2, name: 'water', image: loadImage('img/water.png'), width: 64, height: 32 },
    { code: 3, name: 'dot', image: loadImage('img/dot.png'), width: 64, height: 64 },
];

const map = [
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 1
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 2
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 3
    [0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0], // row 4
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 5
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 6
    [1, 1, 3, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1], // row 7
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 8
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 0, 0, 0], // row 9
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 0, 0, 0], // row 10
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 11
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 12
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 13
    [0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0], // row 14
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // row 15
];

/* Camera settings */
let zoomLevel = 1;
let panX = 0;
let panY = 0;

/* Used to track if we are panning */
let panningInterval;

/*
    Used to track the directions in which the camera will pan.

    We need to track multiple direction in case the user wants
    to pan diagonally by holding down two arrow keys at once.
*/
const activePanningDirections = [];

/* Checks whether an image has been loaded by the browser */
const imageHasLoaded = (img) => {
  return img.complete && img.naturalHeight !== 0;
};

/*
    A reference for the drawMap function that is
    in the code in multiple locations
*/
let drawMap;

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');


/* Resizes the canvas so that it always fits within the window */
function resizeCanvas() {
    // Get the dimensions of the browser window
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate the canvas width based on the aspect ratio
    let canvasWidth = windowWidth;
    let canvasHeight = windowWidth / aspectRatio;

    // If the calculated height is larger than the window height, adjust the dimensions
    if (canvasHeight > windowHeight) {
        canvasHeight = windowHeight;
        canvasWidth = windowHeight * aspectRatio;
    }

    // Set the canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    if (drawMap) drawMap();
}

// Call the resizeCanvas function initially and when the window is resized
window.addEventListener('resize', resizeCanvas);

/*
    This function draws the map onto the canvas.
    It calculates the position of each tile based on the map data,
    the zoom level, and the pan offsets.
*/
drawMap = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const offsetX = mapWidth * (BASE_TILE_WIDTH / 2) * zoomLevel - (BASE_TILE_WIDTH / 2) * zoomLevel;
    const mapWidthPixels = mapWidth * BASE_TILE_WIDTH * zoomLevel;
    const mapHeightPixels = mapHeight * BASE_TILE_HEIGHT * zoomLevel;
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2;
    const mapX = centerX - mapWidthPixels / 2 + panX;
    const mapY = centerY - mapHeightPixels / 2 + panY;

    for (let row = 0; row < mapWidth; row++) {
        for (let column = 0; column < mapHeight; column++) {
            const tileCode = map[row][column];
            const tile = tilesLibrary.find(t => t.code === tileCode);
            const x = (column - row) * tile.width / 2 * zoomLevel + mapX;
            const y = (column + row) * BASE_TILE_HEIGHT / 2 * zoomLevel + mapY - ((tile.height - BASE_TILE_HEIGHT) * zoomLevel);
            ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * zoomLevel, tile.height * zoomLevel);
        }
    }
}

/*
    When the user pressed a keyboard key down, we will check what key it is,
    and execute any action that is linked to that key.
*/
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !activePanningDirections.includes('left')) {
        // Start panning left
        startPanning('left');
    } else if (e.key === 'ArrowRight' && !activePanningDirections.includes('right')) {
        // Start panning right
        startPanning('right');
    } else if (e.key === 'ArrowUp' && !activePanningDirections.includes('up')) {
        // Start panning up
        startPanning('up');
    } else if (e.key === 'ArrowDown' && !activePanningDirections.includes('down')) {
        // Start panning down
        startPanning('down');
    } else if (e.key === '-') {
        // Zoom out
        zoomLevel /= 1.1; // You can adjust the zoom factor as needed
        drawMap();
    } else if (e.key === '=') {
        // Zoom in
        zoomLevel *= 1.1; // You can adjust the zoom factor as needed
        drawMap();
    } else if (e.key === '0') {
        // Reset zoom to 1
        zoomLevel = 1;
        drawMap();
    } else if (e.key === 'c') {
        // Center the map
        panX = 0;
        panY = 0;
        drawMap();
    }
});

/*
    When the user releases a keyboard key, we will check what key it is,
    and execute any action that is linked to that key.

    This is useful for stopping panning when the user releases the arrow keys.
*/
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        // Stop panning left
        stopPanning('left');
    } else if (e.key === 'ArrowRight') {
        // Stop panning right
        stopPanning('right');
    } else if (e.key === 'ArrowUp') {
        // Stop panning up
        stopPanning('up');
    } else if (e.key === 'ArrowDown') {
        // Stop panning down
        stopPanning('down');
    }
});

/* * Start panning in a specific direction
    * @param {string} direction - The direction to pan ('left', 'right', 'up', 'down')
    * This function starts an interval that pans the map in the specified direction.
    * If the interval is already running, it will not start a new one.
    * 
    * // TODO - implement use of requestAnimationFrame instead of setInterval
*/
function startPanning(direction) {
    const panSpeed = 10; // Adjust the panning speed as needed
    activePanningDirections.push(direction);
    if (!panningInterval) {
        panningInterval = setInterval(() => {
            for (const dir of activePanningDirections) {
                if (dir === 'left') {
                    panX += panSpeed;
                } else if (dir === 'right') {
                    panX -= panSpeed;
                } else if (dir === 'up') {
                    // We move 1/2 the speed in the y direction because 
                    // then when we do diagonal scrolling, it matches the 
                    // isometric tile ratio better.
                    panY += panSpeed / 2;
                } else if (dir === 'down') {
                    panY -= panSpeed / 2;
                }
            }
            drawMap();
        }, (1000 / 60));
    }
}

/* Stop panning in a specific direction
    * @param {string} direction - The direction to stop panning ('left', 'right', 'up', 'down')
    * This function stops the panning interval for the specified direction.
*/
function stopPanning(direction) {
    const index = activePanningDirections.indexOf(direction);
    if (index !== -1) {
        activePanningDirections.splice(index, 1);
    }
    if (activePanningDirections.length === 0) {
        clearInterval(panningInterval);
        panningInterval = null;
    }
}

/*
    Listen to mousewheel events to zoom in and out.
*/
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
        // Zoom in
        zoomLevel *= zoomFactor;
    } else {
        // Zoom out
        zoomLevel /= zoomFactor;
    }
    drawMap();
}, { passive: false });

canvas.addEventListener('click', (e) => {
    // Get canvas bounding rect and mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left);
    const mouseY = (e.clientY - rect.top);

    // Calculate map offset as in drawMap
    const offsetX = mapWidth * (BASE_TILE_WIDTH / 2) * zoomLevel - (BASE_TILE_WIDTH / 2) * zoomLevel;
    const mapWidthPixels = mapWidth * BASE_TILE_WIDTH * zoomLevel;
    const mapHeightPixels = mapHeight * BASE_TILE_HEIGHT * zoomLevel;
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2;
    const mapX = centerX - mapWidthPixels / 2 + panX;
    const mapY = centerY - mapHeightPixels / 2 + panY;

    // Convert mouse position to map coordinates
    const relX = mouseX - mapX;
    const relY = mouseY - mapY;

    // Inverse isometric transform
    const tileW = BASE_TILE_WIDTH * zoomLevel;
    const tileH = BASE_TILE_HEIGHT * zoomLevel;
    let col = Math.floor((relX / (tileW / 2) + relY / (tileH / 2)) / 2);
    let row = Math.floor((relY / (tileH / 2) - relX / (tileW / 2)) / 2);

    // Clamp to map bounds
    if (col < 0 || col >= mapWidth || row < 0 || row >= mapHeight) {
        console.log('Clicked outside map');
        return;
    }

    // Almost perfect detects the tile clicked on, but we need to adjust for the isometric projection
    map[row][col] = 3;
    drawMap();
    console.log(`Clicked map row: ${row}, column: ${col}`);
});


/* Load the map when all of the images are ready to be rendered */
function loadMapWhenReady() {
    if (tilesLibrary.every(t => imageHasLoaded(t.image))) {
        resizeCanvas();
        drawMap();
    } else {
        setTimeout(loadMapWhenReady, 100);
    }
}

/* This triggers rendering the map */
loadMapWhenReady();