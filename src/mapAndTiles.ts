import { loadImage, loadJSON } from './utils';

/*
    This will be where we store the tileset images, and then we can use
    the code to reference the correct image, as well as lookup the tile size.
*/
const tilesLibrary = [
    { code: 0, name: 'grass', image: loadImage('/img/grass.png'), width: 64, height: 32 },
    { code: 1, name: 'road', image: loadImage('/img/road.png'), width: 64, height: 32 },
    { code: 2, name: 'water', image: loadImage('/img/water.png'), width: 64, height: 32 },
    { code: 3, name: 'dot', image: loadImage('/img/dot.png'), width: 64, height: 64 },
    { code: 4, name: 'dot-only', image: loadImage('/img/dot-only.png'), width: 64, height: 64 },
    { code: 5, name: 'water-round-top', image: loadImage('/img/water-round-top.png'), width: 64, height: 32 },
    { code: 6, name: 'water-round-left', image: loadImage('/img/water-round-left.png'), width: 64, height: 32 },
    { code: 7, name: 'water-round-bottom', image: loadImage('/img/water-round-bottom.png'), width: 64, height: 32 },
    { code: 8, name: 'water-round-right', image: loadImage('/img/water-round-right.png'), width: 64, height: 32 },
    { code: 9, name: 'road-with-markings-tl-br', image: loadImage('/img/road-with-markings-tl-br.png'), width: 64, height: 32 },
    { code: 10, name: 'road-with-markings-bl-tr', image: loadImage('/img/road-with-markings-bl-tr.png'), width: 64, height: 32 },
    { code: 11, name: 'sand', image: loadImage('/img/sand.png'), width: 64, height: 32 },
    { code: 12, name: 'english-townhouse', image: loadImage('/img/english-townhouse.png'), width: 64, height: 64 },
    { code: 13, name: 'cornershop', image: loadImage('/img/cornershop.png'), width: 64, height: 64 }
];

// TODO - we could move this into a Map class, which will allow us to load maps with different numbers of rows and columns, base_tile heights/widths (for more detailed maps), and either generate random maps or load from a file

/*
    Generates a map filled with random tiles - looks nuts but a good way to stress test the capabilities of the engine
*/
const generateRandomMap = (numberOfRows:number, numberOfColumns:number) => {
    const newMap = [];
    for (let i = 0; i < numberOfRows; i++) {
        const row = [];
        for (let j = 0; j < numberOfColumns; j++) {
            const randomTile = Math.floor(Math.random() * tilesLibrary.length);
            row.push([0,randomTile]);
        }
        newMap.push(row);
    }
    return newMap;
}
const map = generateRandomMap(16,16);

// Load the map data from a JSON file
// const map = await loadJSON('/maps/16x16.json');

/*
    We define the map dimensions here to help with drawing 
    the map onto the canvas
*/
const mapRows = map.length;
const mapColumns = map[0].length;

/*
    NOTE - these should be the default tile width and height values, 
    that are used for standard tiles. Any tiles which have different
    dimensions should be specified with that.
*/
const BASE_TILE_WIDTH = 64;
const BASE_TILE_HEIGHT = 32;

export { map, tilesLibrary, mapRows, mapColumns, BASE_TILE_WIDTH, BASE_TILE_HEIGHT };