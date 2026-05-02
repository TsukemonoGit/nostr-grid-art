import { writable } from "svelte/store";
import type { PaletteEmoji } from "$lib/types";

/** パレット絵文字リスト */
export const paletteStore = writable<PaletteEmoji[]>([]);

/** 選択中の絵文字 */
export const selectedEmojiStore = writable<PaletteEmoji | null>(null);

/** 絵文字を選択する（同じ絵文字なら解除） */
export function selectEmoji(emoji: PaletteEmoji): void {
	selectedEmojiStore.update((current) => {
		if (current && current.shortcode === emoji.shortcode) {
			return null;
		}
		return emoji;
	});
}

/** 選択を解除する */
export function deselectEmoji(): void {
	selectedEmojiStore.set(null);
}

/** パレットリストをロードする */
export function loadPalette(list: PaletteEmoji[]): void {
	paletteStore.set(list);
}
