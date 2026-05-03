// GRID-01, GRID-02, GRID-03 の型定義
// カスタム絵文字タグ
// 4要素目はノラ絵文字（10030直接登録）の場合は省略
// ["emoji", resolvedShortcode, url, "30030:pubhex:identifier"]
export type EmojiTag = ["emoji", string, string, string?];

// グリッドのセル。null = 空セル
export type Cell = EmojiTag | null;

// グリッド全体
export type Grid = Cell[][];

// パレットの絵文字エントリ
export interface PaletteEmoji {
	shortcode: string; // 衝突解消済みショートコード
	url: string;
	ref?: string; // "30030:pubhex:identifier"（ノラ絵文字は省略）
	originalShortcode: string; // 衝突前の元ショートコード
}

// null絵文字の設定
export interface NullEmojiConfig {
	type: "custom" | "fullwidth_space";
	emoji?: PaletteEmoji; // type === "custom" の場合
}

// スクロールスパイ型タブUI用のパレットセクション
export interface PaletteSection {
	// セクションの見出し（例: "みんなの30030絵文字セット"）
	label: string;
	// このセクションに所属する絵文字リスト
	emojis: PaletteEmoji[];
}
