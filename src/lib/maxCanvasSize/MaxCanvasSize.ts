import canvasSize from "canvas-size";

const PREVIOUS_RUN_KEY = "maxCanvasSizePreviousRun";

type Result = {
	area: number;
	width: number;
	height: number;
	completed: boolean;
};

type RunResult = {
	testNumber: number;
	successfulTest: number;
	failedTest: number;
};

class MaxCanvasSize {
	hooks: {
		beforeTest: Array<(runResult: RunResult) => void>;
		afterTest: Array<(runResult: RunResult) => void>;
		beforeStoreRun: Array<(result: Result) => void>;
		afterStoreRun: Array<(result: Result) => void>;
	};

	constructor() {
		this.hooks = {
			beforeTest: [],
			afterTest: [],
			beforeStoreRun: [],
			afterStoreRun: [],
		};
	}

	findPreviousRun() {
		const item = localStorage.getItem(PREVIOUS_RUN_KEY);
		if (item) {
			try {
				const parsed = JSON.parse(item);
				if (
					typeof parsed.area === "number" &&
					typeof parsed.width === "number" &&
					typeof parsed.height === "number" &&
					typeof parsed.completed === "boolean"
				) {
					return parsed;
				}
			} catch (e) {
				console.warn("Failed to parse previous max canvas size", e);
			}
		} else {
			return null;
		}
	}

	storeRun(result: Result) {
		this.hooks.beforeStoreRun.forEach((hook) => hook(result));
		localStorage.setItem(PREVIOUS_RUN_KEY, JSON.stringify(result));
		this.hooks.afterStoreRun.forEach((hook) => hook(result));
	}

	async runTest({
		testNumber = 4096,
		successfulTest = 0,
		failedTest = 0,
	}: RunResult): Promise<{ area: number; width: number; height: number }> {
		this.hooks.beforeTest.forEach((hook) =>
			hook({ testNumber, successfulTest, failedTest }),
		);
		const { success } = await canvasSize.test({
			height: testNumber,
			width: testNumber,
			useWorker: true,
		});

		if (success) {
			successfulTest = Math.max(successfulTest, testNumber);
			if (failedTest === 0) {
				// We double the number until we hit a failure
				testNumber = testNumber * 2;
			} else {
				// We take the midpoint between the last successful and the failed test
				testNumber = successfulTest + Math.ceil(failedTest / 2);
			}

			this.storeRun({
				area: successfulTest * successfulTest,
				width: successfulTest,
				height: successfulTest,
				completed: false,
			});
		} else {
			failedTest = testNumber;
			testNumber = Math.ceil((successfulTest + failedTest) / 2);
		}

		if (failedTest && successfulTest && failedTest - successfulTest <= 1) {
			const result = {
				area: successfulTest * successfulTest,
				width: successfulTest,
				height: successfulTest,
				completed: true,
			};
			this.hooks.afterTest.forEach((hook) =>
				hook({ testNumber, successfulTest, failedTest }),
			);
			this.storeRun(result);
			return result;
		} else {
			this.hooks.afterTest.forEach((hook) =>
				hook({ testNumber, successfulTest, failedTest }),
			);
			return await this.runTest({ testNumber, successfulTest, failedTest });
		}
	}
}

export default MaxCanvasSize;
