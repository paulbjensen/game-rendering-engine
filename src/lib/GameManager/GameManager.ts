import type { MapData } from "../../types";

type Game = {
	name: string;
	data: MapData;
};

class GameManager {
	games: Game[];
	storageKey: string = "games";

	constructor() {
		this.games = this.loadFromStorage();
	}

	private loadFromStorage(): Game[] {
		const data = localStorage.getItem(this.storageKey);
		return data ? JSON.parse(data) : [];
	}

	private saveToStorage() {
		localStorage.setItem(this.storageKey, JSON.stringify(this.games));
	}

	list() {
		return this.games;
	}

	load(name: string) {
		const game = this.games.find((g) => g.name === name);
		if (game) {
			return game;
		}
		throw new Error("Game not found");
	}

	save(name: string, data: MapData) {
		const game = this.games.find((g) => g.name === name);
		if (game) {
			Object.assign(game, data);
		} else {
			this.games.push({ name, data });
		}
		this.saveToStorage();
		return this.games.find((g) => g.name === name);
	}

	delete(name: string) {
		const index = this.games.findIndex((g) => g.name === name);
		if (index !== -1) {
			this.games.splice(index, 1);
			this.saveToStorage();
			return true;
		}
		throw new Error("Game not found");
	}
}

export default GameManager;
