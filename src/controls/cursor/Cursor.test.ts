import { describe, it } from "vitest";

describe("Cursor", () => {
	describe("properties", () => {
		it.todo("should have an x value");
		it.todo("should have a y value");
		it.todo("should have an eventEmitter");
		it.todo("can have a target at constructor");
	});

	describe("#setPaintConstraint", () => {
		it.todo("should set the paint constraint property on the cursor instance");
	});

	describe("hasChanged", () => {
		it.todo("should return true if the cursor position has changed");
		it.todo("should return false if the cursor position has not changed");
	});

	describe("onMouseMove", () => {
		it.todo("should update the cursor position");
		it.todo("should extend the stroke if painting");
		it.todo("should highlight the current tile");
	});

	describe("onClick", () => {
		it.todo("should set the gameMap's selectedTile to where the cursor is");
		it.todo("should trigger a redraw of the map");
	});

	describe("calculatePositionOnMap", () => {
		it.todo("should calculate the correct tile position based on the cursor");
	});

	describe("attach", () => {
		it.todo(
			"should attach the cursor to the gameMap, the camera, and the target canvas element",
		);
		it.todo("should attach event listeners for mouse events");
	});

	describe("detach", () => {
		it.todo("should remove the event listeners for mouse events");
	});
});
