import type { ImageAsset } from "../types";
import { loadImage } from "../utils";

class ImageAssetSet {
	baseTileWidth: number;
	baseTileHeight: number;
	imageAssets: ImageAsset[];

	constructor({
		baseTileWidth,
		baseTileHeight,
		imageAssets,
	}: {
		baseTileWidth: number;
		baseTileHeight: number;
		imageAssets: ImageAsset[];
	}) {
		this.baseTileWidth = baseTileWidth;
		this.baseTileHeight = baseTileHeight;
		this.imageAssets = imageAssets;
		this.loadImages = this.loadImages.bind(this);
		this.loadImage = this.loadImage.bind(this);
	}

	loadImage(imageAsset: ImageAsset) {
		const image = loadImage(imageAsset.imageUrl);
		const imageAssetIndex = this.imageAssets.indexOf(imageAsset);
		this.imageAssets[imageAssetIndex] = { ...imageAsset, image };
	}

	loadImages(imageCodes?: number[]) {
		if (imageCodes) {
			imageCodes.forEach((imageCode: number) => {
				const imageAsset = this.imageAssets.find(
					(asset) => asset.code === imageCode,
				);
				if (!imageAsset) {
					return;
				}
				this.loadImage(imageAsset);
			});
		} else {
			this.imageAssets.forEach(this.loadImage);
		}
	}
}

export default ImageAssetSet;
