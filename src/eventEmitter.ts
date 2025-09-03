// Load the dependency class for TypeScript usage
import EventEmitter, { type EventMap } from "@anephenix/event-emitter";
import type { AppMode, Direction, ImageAsset } from "./types";

type MyEvents = EventMap & {
	startPanning: (direction: Direction) => void;
	stopPanning: (direction: Direction) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;
	recenter: () => void;
	pan: (dx: number, dy: number) => void;
	adjustZoom: (zoomFactor: number) => void;
	selectImageAsset: (imageAsset: ImageAsset) => void;
	click: (tile: [number, number] | null) => void;
	clickBatch: (tiles: [number, number][]) => void;
	drawPreview: (tiles: [number, number][]) => void;
	clearPreview: () => void;
	setAppMode: (mode: AppMode) => void;
	loadGame: () => void;
	saveGame: (name: string) => void;
	deleteGame: (name: string) => void;
};

// Create an instance of the event emitter class with type safety
const eventEmitter = new EventEmitter<MyEvents>();

export default eventEmitter;
