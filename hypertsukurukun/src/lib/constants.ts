// REQUIREMENTS.md 未確定事項: これらの値は確定次第書き換えること
// アプリ固有のnull絵文字（透明・正方形）。shortcodeとURLが確定したら差し替える
export const NULL_EMOJI_SHORTCODE = "blank";
export const NULL_EMOJI_URL = "https://example.com/blank.png";

// アプリ用 kind 30030 をホストするpubkeyとリレー。確定したら差し替える
export const APP_30030_PUBKEY = "";
export const APP_30030_RELAY = "";

// 初回ログイン時に kind 10002 を探しに行く既知リレー。運用に合わせて書き換える
export const BOOTSTRAP_RELAYS = [
	"wss://relay.damus.io",
	"wss://nos.lol",
	"wss://relay.nostr.band",
];

// GRID-01: 初期サイズ 8×8
export const GRID_INITIAL_ROWS = 8;
export const GRID_INITIAL_COLS = 8;

// GRID-02: 最大サイズ 64×64
export const GRID_MAX_ROWS = 64;
export const GRID_MAX_COLS = 64;

// STR-01, STR-02, STR-03: localStorage のキー名
export const STORAGE_KEYS = {
	GRID: "hyptsukuru_grid",
	PALETTE: "hyptsukuru_palette",
	NULL_EMOJI: "hyptsukuru_null_emoji",
} as const;
