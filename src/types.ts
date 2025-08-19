export type Direction = 'up' | 'down' | 'left' | 'right';

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];

export type ImageAsset = {
    code: number;
    name: string;
    imageUrl: string;
    image: HTMLImageElement | null;
    width: number;
    height: number;
}