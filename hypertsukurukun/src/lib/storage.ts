import { STORAGE_KEYS } from "$lib/constants";
import type { Grid, PaletteEmoji, NullEmojiConfig } from "$lib/types";

/** localStorageに安全にアクセスするヘルパー（ない場合はnullを返す） */
function getLocalStorageItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** localStorageに安全に値を書くヘルパー（エラー時は無視） */
function setLocalStorageItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// localStorageが利用できない環境では無視する
	}
}

/** グリッドをlocalStorageに保存する */
export function saveGrid(grid: Grid): void {
	setLocalStorageItem(STORAGE_KEYS.GRID, JSON.stringify(grid));
}

/** localStorageからグリッドをロードする（ない場合はnull） */
export function loadGrid(): Grid | null {
	const raw = getLocalStorageItem(STORAGE_KEYS.GRID);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		// 基本的なバリデーション：配列かつ2次元配列か確認
		if (!Array.isArray(parsed) || !parsed.every((row: unknown) => Array.isArray(row))) {
			return null;
		}
		return parsed as Grid;
	} catch {
		return null;
	}
}

/** パレットをlocalStorageに保存する */
export function savePalette(list: PaletteEmoji[]): void {
	setLocalStorageItem(STORAGE_KEYS.PALETTE, JSON.stringify(list));
}

/** localStorageからパレットをロードする（ない場合はnull） */
export function loadPalette(): PaletteEmoji[] | null {
	const raw = getLocalStorageItem(STORAGE_KEYS.PALETTE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return null;
		return parsed as PaletteEmoji[];
	} catch {
		return null;
	}
}

/** null絵文字を設定をlocalStorageに保存する */
export function saveNullEmoji(config: NullEmojiConfig): void {
	setLocalStorageItem(STORAGE_KEYS.NULL_EMOJI, JSON.stringify(config));
}

/** localStorageからnull絵文字設定をロードする（ない場合はnull） */
export function loadNullEmoji(): NullEmojiConfig | null {
	const raw = getLocalStorageItem(STORAGE_KEYS.NULL_EMOJI);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || !parsed.type) return null;
		return parsed as NullEmojiConfig;
	} catch {
		return null;
	}
}
