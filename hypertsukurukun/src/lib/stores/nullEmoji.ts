import { writable } from "svelte/store";
import type { NullEmojiConfig, PaletteEmoji } from "$lib/types";
import { NULL_EMOJI_SHORTCODE, NULL_EMOJI_URL } from "$lib/constants";

/** デフォルトnull絵文字の初期値を生成する */
function createDefaultNullEmoji(): NullEmojiConfig {
	const defaultEmoji: PaletteEmoji = {
		shortcode: NULL_EMOJI_SHORTCODE,
		url: NULL_EMOJI_URL,
		originalShortcode: NULL_EMOJI_SHORTCODE,
	};
	return { type: "custom", emoji: defaultEmoji };
}

/** null絵文字設定store */
export const nullEmojiStore = writable<NullEmojiConfig>(createDefaultNullEmoji());
