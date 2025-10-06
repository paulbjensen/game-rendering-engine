import * as Sentry from "@sentry/svelte";
import { mount } from "svelte";
import App from "./App.svelte";

const isDev = import.meta.env.DEV;

// We only run the Sentry integration in production, as we don't want to
// overwhelm the Sentry project with errors from development.
if (!isDev) {
	Sentry.init({
		dsn: "https://cf55d1d44be3b8c823e635cd99f21f8e@o95413.ingest.us.sentry.io/4510143032918016",
		// Setting this option to true will send default PII data to Sentry.
		// For example, automatic IP address collection on events
		sendDefaultPii: true,
	});
}

const appElement: HTMLElement | null = document.getElementById("app");

if (!appElement) {
	throw new Error("No app element found in the DOM");
}

const app = mount(App, { target: appElement });

export default app;
