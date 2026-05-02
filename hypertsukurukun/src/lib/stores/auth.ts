import { writable, derived } from "svelte/store";

/** 現在のpubkey（ログイン済みの場合は hex、未ログインの場合は null） */
export const pubkeyStore = writable<string | null>(null);

/** ログイン状態（pubkeyがnullでない場合true） */
export const isLoggedInStore = derived(pubkeyStore, ($pubkey) => $pubkey !== null);
