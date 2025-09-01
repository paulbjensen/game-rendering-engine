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

export { loadImage, loadJSON, imageHasLoaded, delayUntil };
