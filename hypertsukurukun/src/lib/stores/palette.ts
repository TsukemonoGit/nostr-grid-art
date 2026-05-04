import { writable } from "svelte/store";
import type { PaletteEmoji, PaletteSection } from "$lib/types";
import { savePalette, savePaletteSections } from "$lib/storage";

/** パレット絵文字リスト */
export const paletteStore = writable<PaletteEmoji[]>([]);

/** スクロールスパイ型タブ用のセクションリスト */
export const paletteSectionsStore = writable<PaletteSection[]>([]);

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

/** パレットリストをセクション付きでロードする */
export function loadPaletteSections(sections: PaletteSection[]): void {
	paletteSectionsStore.set(sections);
	// 全セクションの絵文字をフラットなリストにも保持
	const all = sections.flatMap((s) => s.emojis);
	paletteStore.set(all);
	savePalette(all);
	savePaletteSections(sections);
}

/** フラットなパレットリストからセクションを生成する */
export function buildSectionsFromFlat(
	emojis: PaletteEmoji[],
	// refの接頭辞でセクションを分類する（例: "30030:" で始まるか）
	sectionKeyFn: (emoji: PaletteEmoji) => string,
	// セクションキーから表示ラベルを生成する関数
	labelFn: (key: string) => string,
): PaletteSection[] {
	const map = new Map<string, PaletteEmoji[]>();
	for (const emoji of emojis) {
		const key = sectionKeyFn(emoji);
		if (!map.has(key)) {
			map.set(key, []);
		}
		map.get(key)!.push(emoji);
	}
	return Array.from(map.entries()).map(([key, emojis]) => ({
		label: labelFn(key),
		emojis,
	}));
}

/** フラットリストからrefベースでセクションを自動生成する */
export function sectionsFromFlatList(emojis: PaletteEmoji[]): PaletteSection[] {
	return buildSectionsFromFlat(
		emojis,
		(e) => e.ref || "__nostr__",
		(key) => {
			if (key.startsWith("30030:")) {
				return "Nostr絵文字";
			}
			return "Nostr絵文字";
		},
	);
}


paletteStore.subscribe(v => {
	console.log("paletteStore:", v.length, "items");
});
paletteSectionsStore.subscribe(v => {
	console.log("paletteSectionsStore:", v.length, "sections");
});