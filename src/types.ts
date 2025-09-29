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

export type SpriteLoop = "loop" | "hold" | "pingpong";

export type SpriteAnimation = {
	frames: number[]; // indices into the frame list (grid-indexed or rect-indexed)
	frameDurationMs: number; // per-frame time
	loop: SpriteLoop;
};

export type GridSpriteMeta = {
	mode: "grid";
	frameSize: [number, number];
	grid: { rows: number; cols: number; order?: "row-major" | "col-major" };
	animations: Record<string, SpriteAnimation>;
	defaultAnimation: string;
};

export type RectsSpriteMeta = {
	mode: "rects";
	rects: { x: number; y: number; w: number; h: number }[];
	animations: Record<string, SpriteAnimation>;
	defaultAnimation: string;
};

export type SpriteMeta = GridSpriteMeta | RectsSpriteMeta;

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
	anchor: [number, number];
	sprite?: SpriteMeta; // NEW
	stack?: boolean; // NEW - if true, allows stacking of multiple instances on same tile
};

export type ImageAssetSetOption = {
	name: string;
	url: string;
	baseTileWidth: number;
	baseTileHeight: number;
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

	// NEW (optional). If omitted, use asset.sprite.defaultAnimation
	animationName?: string;
	animationStartMs?: number; // engine fills this when first drawn
	animationPaused?: boolean;
	animationPingPongDir?: 1 | -1; // internal state for ping-pong
	animationFrameOverride?: number; // for scripting/manual control
};

export type MapDataV2 = {
	version: number;
	ground: MapData;
	entities: Entity[];
	imageAssetSetUrl: string;
	panX?: number;
	panY?: number;
	zoomLevel?: number;
};

export type AppMode = "modal" | "navigation" | "edit";
