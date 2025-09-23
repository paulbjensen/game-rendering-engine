import type { MapDataV2 } from "./types";

/*
    A helper function to load images in the browser without needing
    to render them in the page yet
*/
const loadImage = (src: string) => {
	const image = new Image();
	image.src = src;
	return image;
};

/* A helper function to load JSON data from a URL */
const loadJSON = (url: string) => {
	return fetch(url).then((response) => {
		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		return response.json();
	});
};

/* Checks whether an image has been loaded by the browser */
const imageHasLoaded = (img: HTMLImageElement) => {
	return img.complete && img.naturalHeight !== 0;
};

const delayUntil = (condition: () => boolean, interval: number = 100) => {
	return new Promise<void>((resolve) => {
		const checkCondition = () => {
			if (condition()) {
				resolve();
			} else {
				setTimeout(checkCondition, interval);
			}
		};
		checkCondition();
	});
};

const loadMapData = async (url: string): Promise<MapDataV2> => {
	const data = await loadJSON(url);
	if (!data) {
		throw new Error(`Failed to load map data from ${url}`);
	}
	const isVersionOne = Array.isArray(data);
	if (isVersionOne) {
		return {
			ground: data,
			version: 2,
			entities: [],
			imageAssetSetUrl: "/imageAssetSets/1.json",
		};
	} else {
		return data;
	}
};

export { loadImage, loadJSON, loadMapData, imageHasLoaded, delayUntil };
