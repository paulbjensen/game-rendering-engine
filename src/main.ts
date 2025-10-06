import * as Sentry from "@sentry/svelte";
import { mount } from "svelte";
import App from "./App.svelte";

Sentry.init({
	dsn: "https://f5c21ee8e3324bec1e7443982acca134@o95413.ingest.us.sentry.io/4510142976688128",
	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	sendDefaultPii: true,
});

const appElement: HTMLElement | null = document.getElementById("app");

if (!appElement) {
	throw new Error("No app element found in the DOM");
}

const app = mount(App, { target: appElement });

export default app;
