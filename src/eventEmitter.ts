// Load the dependency class for TypeScript usage
import EventEmitter, { type EventMap } from "@anephenix/event-emitter";
import type { Direction } from './types';

type MyEvents = EventMap & {
  startPanning: (direction: Direction) => void;
  stopPanning: (direction: Direction) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  recenter: () => void;
}

// Create an instance of the event emitter class with type safety
const eventEmitter = new EventEmitter<MyEvents>();

export default eventEmitter;