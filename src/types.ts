export type Direction = 'up' | 'down' | 'left' | 'right';

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];

export type ImageAsset = {
    code: number;
    name: string;
    type: 'terrain' | 'road' | 'building' | 'random';
    imageUrl: string;
    image: HTMLImageElement | null;
    width: number;
    height: number;
}

export type AppMode = 'navigation' | 'edit';
