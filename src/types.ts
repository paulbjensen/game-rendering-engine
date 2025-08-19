export type Direction = 'up' | 'down' | 'left' | 'right';

export type MapTile = number | [number, ...number[]];
export type MapData = MapTile[][];
