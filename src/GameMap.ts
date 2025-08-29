import type ImageAssetSet from "./assets/ImageAssetSet";
import type Camera from "./Camera";
import type { MapData } from "./types";
import { delayUntil, imageHasLoaded } from "./utils";

class GameMap {

    target: HTMLCanvasElement;
    camera: Camera;
    map: MapData
    rows: number;
    columns: number;
    selectedTile: [number, number] | null = null;
    imageAssetSet: ImageAssetSet;
    constructor({ target, camera, map, imageAssetSet }: { target: HTMLCanvasElement, camera: Camera, map: MapData, imageAssetSet: ImageAssetSet }) {
        this.target = target;
        this.camera = camera;
        this.map = map;
        this.imageAssetSet = imageAssetSet;
        this.draw = this.draw.bind(this);
        this.loadImageAssets = this.loadImageAssets.bind(this);
        this.hasLoaded = this.hasLoaded.bind(this);
        this.load = this.load.bind(this);
        this.getMapCoords = this.getMapCoords.bind(this);
        this.rows = map.length;
        // TODO - check that the map columns are equal for all rows? - Perhaps we want to draw unusual shaped maps in the future - maybe like the inside of a building with curved walls as an example, or game maps that look like levels with rooms?
        // Actually - we might want to create maps like dungeons as an example - we'd need to be able to do that 
        this.columns = map[0].length;
    }

    loadImageAssets() {
        const loadOnlyMapAssets = false;
        if (loadOnlyMapAssets) {
            const imageCodes = new Set<number>();
            for (const row of this.map) {
                for (const column of row) {
                    for (const tile of Array.isArray(column) ? column : [column]) {
                        imageCodes.add(tile);
                    }
                }
            }

            this.imageAssetSet.loadImages(Array.from(imageCodes));
        } else {
            this.imageAssetSet.loadImages();
        }
    }

    hasLoaded() {
        const imageAssets = this.imageAssetSet.imageAssets.filter(imageAsset => imageAsset.image);
        const imagesHaveLoaded = imageAssets.length > 0 && imageAssets.every(imageAsset => imageAsset.image && imageHasLoaded(imageAsset.image));
        return imagesHaveLoaded;
    }

    async load() {
        this.loadImageAssets();
        await delayUntil(() => this.hasLoaded());
    }

    getMapCoords () {
        const offsetX = this.rows * (this.imageAssetSet.baseTileWidth / 2) * this.camera.zoomLevel - (this.imageAssetSet.baseTileWidth / 2) * this.camera.zoomLevel;
        const mapRowsPixels = this.rows * this.imageAssetSet.baseTileWidth * this.camera.zoomLevel;
        const mapColumnsPixels = this.columns * this.imageAssetSet.baseTileHeight * this.camera.zoomLevel;
        const centerX = this.target.width / 2 + offsetX;
        const centerY = this.target.height / 2;
        const mapX = centerX - mapRowsPixels / 2 + this.camera.panX;
        const mapY = centerY - mapColumnsPixels / 2 + this.camera.panY;
        return { mapX, mapY };
    }

    drawCursorAt(row:number, column:number) {
        const ctx = this.target.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }

        const { mapX, mapY } = this.getMapCoords();

        // NOTE - copied from draw - can be dried up

        // Draw a diamond around the selected tile

        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * this.camera.zoomLevel;
        // Calculate the top-left corner of the tile in screen coordinates
        const tile = this.imageAssetSet.imageAssets.find(t => t.code === this.map[row][column]);
        const tileWidth = this.imageAssetSet.baseTileWidth * this.camera.zoomLevel;
        const tileHeight = this.imageAssetSet.baseTileHeight * this.camera.zoomLevel;
        const x = (column - row) * tileWidth / 2 + mapX;
        const y = (column + row) * tileHeight / 2 + mapY - ((tile?.height ? tile.height : this.imageAssetSet.baseTileHeight) - this.imageAssetSet.baseTileHeight) * this.camera.zoomLevel;

        ctx.beginPath();
        ctx.moveTo(x + tileWidth / 2, y);
        ctx.lineTo(x + tileWidth, y + tileHeight / 2);
        ctx.lineTo(x + tileWidth / 2, y + tileHeight);
        ctx.lineTo(x, y + tileHeight / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    draw() {
        const ctx = this.target.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }

        ctx.clearRect(0, 0, this.target.width, this.target.height);

        const { mapX, mapY } = this.getMapCoords();

        // row is mapped to width, height to column
        for (let row = 0; row < this.rows; row++) {
            for (let column = 0; column < this.columns; column++) {

                // An array of arrays, it's nested by row, then by column
                const tileCode = this.map[row][column];
                if (Array.isArray(tileCode)) {
                    // If the tile code is an array, we need to render multiple tiles
                    for (const code of tileCode) {
                        const tile = this.imageAssetSet.imageAssets.find(t => t.code === code);
                        if (!tile || !tile.image) continue;

                        const x = (column - row) * tile.width / 2 * this.camera.zoomLevel + mapX;
                        const y = (column + row) * this.imageAssetSet.baseTileHeight / 2 * this.camera.zoomLevel + mapY - ((tile.height - this.imageAssetSet.baseTileHeight) * this.camera.zoomLevel);
                        ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * this.camera.zoomLevel, tile.height * this.camera.zoomLevel);
                    }
                } else {
                    const tile = this.imageAssetSet.imageAssets.find(t => t.code === tileCode);
                    if (!tile || !tile.image) continue;

                    const x = (column - row) * tile.width / 2 * this.camera.zoomLevel + mapX;
                    const y = (column + row) * this.imageAssetSet.baseTileHeight / 2 * this.camera.zoomLevel + mapY - ((tile.height - this.imageAssetSet.baseTileHeight) * this.camera.zoomLevel);
                    ctx.drawImage(tile.image, 0, 0, tile.width, tile.height, x, y, tile.width * this.camera.zoomLevel, tile.height * this.camera.zoomLevel);
                }
            }
        }

        if (this.selectedTile) {
            this.drawCursorAt(...this.selectedTile);
        }

    }
}

export default GameMap;