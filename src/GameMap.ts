import type Camera from "./Camera";
import {  BASE_TILE_HEIGHT, BASE_TILE_WIDTH, tilesLibrary } from './mapAndTiles';
import type { MapData } from "./types";

class GameMap {

    target: HTMLCanvasElement;
    camera: Camera;
    map: MapData
    rows: number;
    columns: number;
    constructor({ target, camera, map }: { target: HTMLCanvasElement, camera: Camera, map: MapData }) {
        this.target = target;
        this.camera = camera;
        this.map = map;
        this.draw = this.draw.bind(this);
        this.rows = map.length;
        this.columns = map[0].length; // TODO - check that the map columns are equal for all rows?
    }

    draw() {
        const ctx = this.target.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }

        ctx.clearRect(0, 0, this.target.width, this.target.height);

        const offsetX = this.rows * (BASE_TILE_WIDTH / 2) * this.camera.zoomLevel - (BASE_TILE_WIDTH / 2) * this.camera.zoomLevel;
        const mapRowsPixels = this.rows * BASE_TILE_WIDTH * this.camera.zoomLevel;
        const mapColumnsPixels = this.columns * BASE_TILE_HEIGHT * this.camera.zoomLevel;
        const centerX = this.target.width / 2 + offsetX;
        const centerY = this.target.height / 2;
        const mapX = centerX - mapRowsPixels / 2 + this.camera.panX;
        const mapY = centerY - mapColumnsPixels / 2 + this.camera.panY;

        // row is mapped to width, height to column
        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {

                // An array of arrays, it's nested by row, then by column
                const tileCode = this.map[row][column];
                if (Array.isArray(tileCode)) {
                    // If the tile code is an array, we need to render multiple tiles
                    for (const code of tileCode) {
                        const tile = tilesLibrary.find(t => t.code === code);
                        if (!tile) continue;

                        const x = (column - row) * tile.width / 2 * this.camera.zoomLevel + mapX;
                        const y = (column + row) * BASE_TILE_HEIGHT / 2 * this.camera.zoomLevel + mapY - ((tile.height - BASE_TILE_HEIGHT) * this.camera.zoomLevel);
                        ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * this.camera.zoomLevel, tile.height * this.camera.zoomLevel);
                    }
                } else {
                    const tile = tilesLibrary.find(t => t.code === tileCode);
                    if (!tile) continue;

                    const x = (column - row) * tile.width / 2 * this.camera.zoomLevel + mapX;
                    const y = (column + row) * BASE_TILE_HEIGHT / 2 * this.camera.zoomLevel + mapY - ((tile.height - BASE_TILE_HEIGHT) * this.camera.zoomLevel);
                    ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * this.camera.zoomLevel, tile.height * this.camera.zoomLevel);

                }
            }
        }
    }
}

export default GameMap;