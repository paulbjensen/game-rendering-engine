class History {
	events: Array<Record<string, unknown>>;
	trackedEventIndex: number;

	constructor() {
		this.events = [];
		this.trackedEventIndex = -1; // Starts at -1 because no events yet
	}

	addEvent(event: Record<string, unknown>) {
		this.trackedEventIndex++;
		this.events.splice(this.trackedEventIndex, 1, event);
	}

	undo() {
		const event = this.events[this.trackedEventIndex];
		this.trackedEventIndex = Math.max(this.trackedEventIndex - 1, 0);
		return event;
	}

	redo() {
		this.trackedEventIndex = Math.min(
			this.trackedEventIndex + 1,
			this.events.length - 1,
		);
		const event = this.events[this.trackedEventIndex];
		return event;
	}
}

export default History;
