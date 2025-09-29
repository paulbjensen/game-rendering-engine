import canvasSize from "canvas-size";

/*
    This is the key used in localStorage for storing the successful 
    results of the previous run of the maxCanvasSize class' 
    runTest() function.
*/
const PREVIOUS_RUN_KEY = "maxCanvasSizePreviousRun";

/* Typescript types */

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

/*
    The MaxCanvasSize class is responsible for determining the maximum
    canvas size that can be created in the current browser environment,
    using a binary search approach to efficiently find the maximum size,
    and then storing the result in localStorage for future reference.

    It also provides hooks for before and after tests and storage operations,
    allowing for custom behavior to be injected at these points.
*/
class MaxCanvasSize {
	// We use these to help store any functions that we want to call
	// before and after certain operations, like running a test or
	// storing a result.
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

	/*
        Looks for a previous run's result in localStorage.
        If found, it parses and returns the result object.
        If not found or if parsing fails, it returns null.
    */
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

	/*
        Stores the result of a test run in localStorage.
        It also calls any registered hooks before and after storing the result.
    */
	storeRun(result: Result) {
		this.hooks.beforeStoreRun.forEach((hook) => hook(result));
		localStorage.setItem(PREVIOUS_RUN_KEY, JSON.stringify(result));
		this.hooks.afterStoreRun.forEach((hook) => hook(result));
	}

	/*
        Runs a test to determine the maximum canvas size that can be created.
        It uses a binary search approach, starting with a specified test number,
        and adjusting the test number based on whether the previous test was successful or not.
        The function continues until it finds the maximum size, at which point it stores the result
        and returns it.

        @param testNumber The current size to test (both width and height).
        @param successfulTest The largest size that was successfully created so far.
        @param failedTest The smallest size that failed to be created so far.
    */
	async runTest({
		testNumber = 4096,
		successfulTest = 0,
		failedTest = 0,
	}: RunResult): Promise<{ area: number; width: number; height: number }> {
		this.hooks.beforeTest.forEach((hook) =>
			hook({ testNumber, successfulTest, failedTest }),
		);

		/*
            The type of the result is { success: boolean }, but it looks 
            like the @types/canvas-size expects to return a boolean directly.

            I think it's possible that there was a change made and the types 
            haven't been updated to reflect that yet.
        */
		const { success } = await canvasSize.test({
			height: testNumber,
			width: testNumber,
			useWorker: true,
		});

		if (success) {
			// We update the record of the last successful test
			successfulTest = Math.max(successfulTest, testNumber);

			if (failedTest === 0) {
				// We double the test number to quickly find an upper limit
				testNumber = testNumber * 2;
			} else {
				// We take the midpoint between the last successful test and the failed test
				testNumber = successfulTest + Math.ceil(failedTest / 2);
			}

			// We store the current successful test result to have a record of progress
			this.storeRun({
				area: successfulTest * successfulTest,
				width: successfulTest,
				height: successfulTest,
				completed: false,
			});
		} else {
			failedTest = testNumber;
			// We pick a new test number halfway between
			// the last successful test and the failed test
			testNumber = Math.ceil((successfulTest + failedTest) / 2);
		}

		// We check if we have found the maximum size possible
		if (failedTest && successfulTest && failedTest - successfulTest <= 1) {
			// If we have, we create the final result object and store it
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
			// If we haven't found the maximum size yet, we continue testing until we do
			this.hooks.afterTest.forEach((hook) =>
				hook({ testNumber, successfulTest, failedTest }),
			);
			return await this.runTest({ testNumber, successfulTest, failedTest });
		}
	}
}

export default MaxCanvasSize;
