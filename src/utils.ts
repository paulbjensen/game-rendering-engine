/*
    A helper function to load images in the browser without needing
    to render them in the page yet
*/
const loadImage = (src) => {
    const image = new Image();
    image.src = src;
    return image;
};

/* A helper function to load JSON data from a URL */
const loadJSON = (url) => {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
};

/* Checks whether an image has been loaded by the browser */
const imageHasLoaded = (img) => {
    return img.complete && img.naturalHeight !== 0;
};

export { loadImage, loadJSON, imageHasLoaded }