export type Direction = "up" | "down" | "left" | "right";

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];

export type PaintConstraint = "diagonal" | "axial" | "area";

export type ImageAsset = {
	code: number;
	name: string;
	type: "terrain" | "road" | "building" | "random";
	paintConstraint: PaintConstraint;
	imageUrl: string;
	image: HTMLImageElement | null;
	width: number;
	height: number;
};

export type AppMode = "navigation" | "edit";
