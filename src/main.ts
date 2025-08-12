import { mount } from "svelte";
import "../css/map.css";

import App from "./App.svelte";


const appElement: HTMLElement | null = document.getElementById("app");

if (!appElement) {
	throw new Error("No app element found in the DOM");
}

const app = mount(App, { target: appElement });

export default app;