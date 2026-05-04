// REQUIREMENTS.md 未確定事項: これらの値は確定次第書き換えること
// アプリ固有のnull絵文字（透明・正方形）。shortcodeとURLが確定したら差し替える
export const NULL_EMOJI_SHORTCODE = "empty";
export const NULL_EMOJI_URL = "https://github.com/uchijo/my-emoji/blob/main/general/empty.png?raw=true";

// アプリ用 kind 30030 をホストするpubkeyとリレー。確定したら差し替える
export const APP_30030_PUBKEY = "e62f27d2814a25171c466d2d7612ad1a066db1362b4e259db5c076f9e6b21cb7";
export const APP_30030_DTAG="emoji-edit-empty-only";
export const APP_30030_RELAY = "wss://nos.lol";


// 初回ログイン時に kind 10002 を探しに行く既知リレー。運用に合わせて書き換える
export const BOOTSTRAP_RELAYS = [
//参考 https://nostter.app/nevent1qqsy739r2nqh59p8w4ufwf7ujtp4qxdwjae3uexk5fhn3pf4ntreq8q77psv7
  //kind 0 (ユーザのプロフィール) と kind 10002 (利用中のリレーリスト) 特化
  "wss://directory.yabu.me", //kind0, 3, 10002特化
  //nevent1qvzqqqqqqypzpdc866l8lkwvncdwaqlgrsueg9tvlnm5mm2mpyg3jv8aam445rpqqqsqvjvg63yukccdpfx0285v72skgv59sykpce9jtn3ynmv6jzt0v6qa84j4e
  //nevent1qvzqqqqqqypzpdc866l8lkwvncdwaqlgrsueg9tvlnm5mm2mpyg3jv8aam445rpqqyg8wumn8ghj7mn0wd68ytnhd9hx2qpq7u249qm05a9t83meh7rqxlyxq3gdrtnfswapq2sxly29zxyk0xmq977qva
  "wss://purplepag.es", //https://purplepag.es/what

  //"wss://nos.lol",

  //https://lumilumi.app/nevent1qvzqqqqqqypzp978pfzrv6n9xhq5tvenl9e74pklmskh4xw6vxxyp3j8qkke3cezqqsgfmmcxyknak5frh0jpmp55w2k32l9e9h05qxjvj09hkcf0uh27nclstphx
  //https://github.com/coracle-social/compass
  "wss://indexer.coracle.social",
  "wss://nostr.wine",
  //"wss://relay.nostr.band",
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
	PALETTE_SECTIONS: "hyptsukuru_palette_sections",
	NULL_EMOJI: "hyptsukuru_null_emoji",
} as const;
