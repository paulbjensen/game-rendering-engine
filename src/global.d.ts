// src/global.d.ts
declare module "*.svelte" {
	import { SvelteComponentTyped } from "svelte";

	export default class Component<
		Props = Record<string, unknown>,
		Events = Record<string, CustomEvent<unknown>>,
		Slots = Record<string, unknown>,
	> extends SvelteComponentTyped<Props, Events, Slots> {}
}
