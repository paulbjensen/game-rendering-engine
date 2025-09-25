import { describe, expect, it } from "vitest";
import History from "./History";

describe("history", () => {
	describe("instanting an instance of history", () => {
		it("should have an empty array of events initially", () => {
			const history = new History();
			expect(history.events.length).toBe(0);
		});
	});

	describe("adding an event", () => {
		it("should add an event to the events array", () => {
			const history = new History();
			history.addEvent({ type: "pan", data: { x: 10, y: 20 } });
			expect(history.events.length).toBe(1);
			expect(history.events[0]).toEqual({
				type: "pan",
				data: { x: 10, y: 20 },
			});
			expect(history.trackedEventIndex).toBe(0);
		});
	});

	describe("#undo", () => {
		it("should move the trackedEventIndex back and return the event", () => {
			const history = new History();
			const firstEvent = { type: "pan", data: { x: 10, y: 20 } };
			const secondEvent = { type: "zoom", data: { level: 2 } };
			history.addEvent(firstEvent);
			history.addEvent(secondEvent);
			const event = history.undo();
			expect(event).toEqual(secondEvent);
			expect(history.trackedEventIndex).toBe(0);
		});
	});

	describe("#redo", () => {
		it("should move the trackedEventIndex forward and return the event", () => {
			const history = new History();
			const firstEvent = { type: "pan", data: { x: 10, y: 20 } };
			const secondEvent = { type: "zoom", data: { level: 2 } };
			history.addEvent(firstEvent);
			history.addEvent(secondEvent);
			const event = history.undo();
			expect(event).toEqual(secondEvent);
			const redoEvent = history.redo();
			expect(redoEvent).toEqual(secondEvent);
			expect(history.trackedEventIndex).toBe(1);
		});
	});
});
