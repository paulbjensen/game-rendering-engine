import type { ImageAsset } from "../types";
import { loadImage } from "../utils";

class ImageAssetSet {

    baseTileWidth: number;
    baseTileHeight: number;
    imageAssets: ImageAsset[];

    constructor({baseTileWidth, baseTileHeight, imageAssets}: {baseTileWidth: number, baseTileHeight: number, imageAssets: ImageAsset[]}) {
        this.baseTileWidth = baseTileWidth;
        this.baseTileHeight = baseTileHeight;
        this.imageAssets = imageAssets;
        this.loadImages = this.loadImages.bind(this);
    }

    loadImages(imageCodes: number[]) {

        if (imageCodes) {
            imageCodes.forEach((imageCode: number) => {
                const imageAsset = this.imageAssets.find(asset => asset.code === imageCode);
                if (!imageAsset) { return; }
                const image = loadImage(imageAsset.imageUrl);
                const imageAssetIndex = this.imageAssets.indexOf(imageAsset);
                this.imageAssets[imageAssetIndex] = { ...imageAsset, image };
            });
        } else {
            this.imageAssets.forEach((imageAsset) => {
                const image = loadImage(imageAsset.imageUrl);
                this.imageAssets[this.imageAssets.indexOf(imageAsset)] = { ...imageAsset, image };
            });
        }
    }

}

export default ImageAssetSet;