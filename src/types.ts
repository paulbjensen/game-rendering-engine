export type Direction = "up" | "down" | "left" | "right";

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];

export type MapDataV2 = {
	version: number;
	ground: MapData;
	entities: unknown[];
};

/*
	This is used to help determine the painting behavior of the cursor when 
	applying an image asset to the map (ground).

	single - only apply 1 instance, no support for dragging multiple instances
	area - apply the image asset to the rectangular area dragged by the cursor
	diagonal - apply the image asset diagonally
	axial - apply the image asset along the axial directions (horizontal/vertical)

*/
export type PaintConstraint = "diagonal" | "axial" | "area" | "single";

export type ImageAssetType = "terrain" | "road" | "building" | "random";

export type ImageAsset = {
	code: number;
	name: string;
	type: ImageAssetType;
	paintConstraint: PaintConstraint;
	imageUrl: string;
	image: HTMLImageElement | null;
	width: number;
	height: number;
};

export type AppMode = "navigation" | "edit";
