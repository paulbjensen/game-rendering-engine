export type Direction = "up" | "down" | "left" | "right";

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];

/*
	This is used to help determine the painting behavior of the cursor when 
	applying an image asset to the map (ground).

	single - only apply 1 instance, no support for dragging multiple instances
	area - apply the image asset to the rectangular area dragged by the cursor
	diagonal - apply the image asset diagonally
	axial - apply the image asset along the axial directions (horizontal/vertical)
*/
export type PaintConstraint = "diagonal" | "axial" | "area" | "single";

export type ImageAssetType = "ground" | "entity";

export type ImageAssetSubType = "terrain" | "road" | "building" | "random";

export type ImageAsset = {
	code: number;
	name: string;
	type: ImageAssetType;
	subType: ImageAssetSubType;
	paintConstraint: PaintConstraint;
	imageUrl: string;
	image: HTMLImageElement | null;
	width: number;
	height: number;
	size: [number, number];
};

export type Entity = {
	id: string; // Each entity gets a unique ID for its instance
	code: number; // This is the code for the image asset used to render it
	anchor: [number, number]; // the row/col for the tile on the map where this entity is anchored
	size: [number, number]; // footprint in tiles (rows/cols)
	orientation?: "se" | "sw" | "ne" | "nw"; // optional (se, sw, ne, nw)
	elevation?: number; // tiles high the base sits (for cliffs)
	offsetPx?: [number, number]; // pixel nudge to seat artwork on anchor
	metadata?: Record<string, unknown>; // freeform metadata to store about the entity
};

export type MapDataV2 = {
	version: number;
	ground: MapData;
	entities: Entity[];
};

export type AppMode = "navigation" | "edit";
