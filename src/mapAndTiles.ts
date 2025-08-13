import { loadImage, loadJSON } from './utils';

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

// Load the map data from a JSON file
const map = await loadJSON('/data/map.json');

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

export { map, tilesLibrary, mapWidth, mapHeight, BASE_TILE_WIDTH, BASE_TILE_HEIGHT };