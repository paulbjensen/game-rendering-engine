import { describe, expect, it } from "vitest";
import Keyboard, { type KeyboardOptions } from "./Keyboard";

describe("Keyboard", () => {
	describe("properties", () => {
		it("should have keydown and keyup properties", () => {
			const options: KeyboardOptions = {
				keydown: {},
				keyup: {},
			};
			const keyboard = new Keyboard(options);
			expect(keyboard.options.keydown).toBeDefined();
			expect(keyboard.options.keyup).toBeDefined();
		});

		it("should have pauseListening property", () => {
			const options: KeyboardOptions = {
				keydown: {},
				keyup: {},
			};
			const keyboard = new Keyboard(options);
			expect(keyboard.pauseListening).toBe(false);
		});
	});

	describe("#attach", () => {
		it("should attach event listeners", () => {
			let keyDownCalled = false;
			let keyUpCalled = false;

			const options: KeyboardOptions = {
				keydown: {
					c: () => {
						keyDownCalled = true;
					},
				},
				keyup: {
					c: () => {
						keyUpCalled = true;
					},
				},
			};
			const keyboard = new Keyboard(options);
			keyboard.attach();

			const keyDownEvent = new KeyboardEvent("keydown", { key: "c" });
			const keyUpEvent = new KeyboardEvent("keyup", { key: "c" });
			window.dispatchEvent(keyDownEvent);
			window.dispatchEvent(keyUpEvent);

			expect(keyDownCalled).toBe(true);
			expect(keyUpCalled).toBe(true);
		});
	});

	describe("#detach", () => {
		it("should detach event listeners", () => {
			let keyDownCalled = false;
			let keyUpCalled = false;

			const options: KeyboardOptions = {
				keydown: {
					c: () => {
						keyDownCalled = true;
					},
				},
				keyup: {
					c: () => {
						keyUpCalled = true;
					},
				},
			};
			const keyboard = new Keyboard(options);
			keyboard.attach();
			keyboard.detach();

			const keyDownEvent = new KeyboardEvent("keydown", { key: "c" });
			const keyUpEvent = new KeyboardEvent("keyup", { key: "c" });
			window.dispatchEvent(keyDownEvent);
			window.dispatchEvent(keyUpEvent);

			expect(keyDownCalled).toBe(false);
			expect(keyUpCalled).toBe(false);
		});
	});

	describe("when pauseListening is true", () => {
		it("should not call keydown or keyup actions", () => {
			let keyDownCalled = false;
			let keyUpCalled = false;

			const options: KeyboardOptions = {
				keydown: {
					c: () => {
						keyDownCalled = true;
					},
				},
				keyup: {
					c: () => {
						keyUpCalled = true;
					},
				},
			};
			const keyboard = new Keyboard(options);
			keyboard.pauseListening = true;
			keyboard.attach();

			const keyDownEvent = new KeyboardEvent("keydown", { key: "c" });
			const keyUpEvent = new KeyboardEvent("keyup", { key: "c" });
			window.dispatchEvent(keyDownEvent);
			window.dispatchEvent(keyUpEvent);

			expect(keyDownCalled).toBe(false);
			expect(keyUpCalled).toBe(false);
		});
	});
});
