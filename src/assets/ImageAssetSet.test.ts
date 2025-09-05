import { describe, expect, it } from "vitest";
import type { ImageAsset } from "../types";
import ImageAssetSet from "./ImageAssetSet";

describe("ImageAssetSet", () => {
	const imageAssetOne: ImageAsset = {
		code: 1,
		name: "Test Image",
		type: "terrain",
		paintConstraint: "area",
		imageUrl: "https://babsland.com/img/grass.png",
		image: null,
		width: 64,
		height: 32,
	};

	const imageAssetTwo: ImageAsset = {
		code: 2,
		name: "Test Image 2",
		type: "road",
		paintConstraint: "axial",
		imageUrl: "https://babsland.com/img/road.png",
		image: null,
		width: 64,
		height: 32,
	};

	describe("properties", () => {
		const imageAssetSet = new ImageAssetSet({
			baseTileWidth: 64,
			baseTileHeight: 32,
			imageAssets: [],
		});

		it("should have a baseTileWidth", () => {
			expect(imageAssetSet.baseTileWidth).toBe(64);
		});
		it("should have a baseTileHeight", () => {
			expect(imageAssetSet.baseTileHeight).toBe(32);
		});
		it("should have an array of image assets", () => {
			expect(imageAssetSet.imageAssets).toEqual([]);
		});
	});

	describe("#loadImage", () => {
		it("should load an image asset's image data image from the array of imageAssets, and store it in context", () => {
			const imageAssetSet = new ImageAssetSet({
				baseTileWidth: 64,
				baseTileHeight: 32,
				imageAssets: [imageAssetOne],
			});

			imageAssetSet.loadImage(imageAssetOne);
			expect(imageAssetSet.imageAssets[0].image).not.toBeNull();
			expect(imageAssetSet.imageAssets[0].image).toBeInstanceOf(Image);
		});
	});

	describe("#loadImages", () => {
		describe("when passed a list of image codes", () => {
			it("should load only the images of the image assets listed in the image codes array", () => {
				const imageAssetSet = new ImageAssetSet({
					baseTileWidth: 64,
					baseTileHeight: 32,
					imageAssets: [imageAssetOne, imageAssetTwo],
				});

				imageAssetSet.loadImages([1]);
				expect(imageAssetSet.imageAssets[0].image).not.toBeNull();
				expect(imageAssetSet.imageAssets[0].image).toBeInstanceOf(Image);
				expect(imageAssetSet.imageAssets[1].image).toBeNull();
			});
		});

		describe("when not passed a list of image codes", () => {
			it("should load the images for all of the image assets", () => {
				const imageAssetSet = new ImageAssetSet({
					baseTileWidth: 64,
					baseTileHeight: 32,
					imageAssets: [imageAssetOne, imageAssetTwo],
				});

				imageAssetSet.loadImages();
				expect(imageAssetSet.imageAssets[0].image).not.toBeNull();
				expect(imageAssetSet.imageAssets[0].image).toBeInstanceOf(Image);
				expect(imageAssetSet.imageAssets[1].image).not.toBeNull();
				expect(imageAssetSet.imageAssets[1].image).toBeInstanceOf(Image);
			});
		});
	});
});
