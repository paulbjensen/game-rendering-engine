import { describe, expect, it } from "vitest";
import GameManager from "./GameManager";

describe("GameManager", () => {
	it("should initialize with default values", () => {
		const gameManager = new GameManager();
		expect(gameManager).toBeDefined();
	});
});
