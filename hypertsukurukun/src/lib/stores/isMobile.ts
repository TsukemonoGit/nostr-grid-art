import { writable, derived } from "svelte/store";

export const isMobile = writable<boolean >(false);