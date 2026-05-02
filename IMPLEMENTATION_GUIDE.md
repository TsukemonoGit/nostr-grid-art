# 実装手順書：Nostr Custom Emoji ハイパーつくるくん

バージョン：1.0  
対象：AIエージェント  
前提：要件書（REQUIREMENTS.md）を先に読むこと

---

## 前提条件

- Node.js 18+ がインストール済みであること
- 作業ディレクトリが指定済みであること
- 各フェーズは順番通りに実行すること
- 各フェーズの「完了条件」を満たすまで次のフェーズに進まないこと

---

## フェーズ一覧

| フェーズ | 内容                      | 依存    |
| -------- | ------------------------- | ------- |
| P0       | プロジェクト初期化        | なし    |
| P1       | 型定義・定数              | P0      |
| P2       | 状態管理（Svelte stores） | P1      |
| P3       | localStorage永続化        | P2      |
| P4       | パレット取得ロジック      | P1      |
| P5       | グリッドコンポーネント    | P2      |
| P6       | パレットコンポーネント    | P2      |
| P7       | コンテキストメニュー      | P5      |
| P8       | グリッドサイズ変更        | P5      |
| P9       | スクロール                | P5      |
| P10      | null絵文字設定UI          | P6      |
| P11      | 出力・投稿                | P2      |
| P12      | ログイン                  | P4、P11 |
| P13      | レイアウト統合            | P5〜P12 |

---

## フェーズ P0：プロジェクト初期化

### タスク

```bash
# SvelteKitプロジェクト作成
npx sv create hypertsukurukun --template minimal --types ts --no-add-ons

cd hypertsukurukun

# 依存パッケージインストール
npm install rx-nostr rx-nostr/crypto @konemono/nostr-login
npm install nip07-awaiter
npm install -D @types/node
```

### 作成・確認するファイル

- `package.json`：上記パッケージが含まれること
- `svelte.config.js`：adapter-auto が設定済みであること
- `tsconfig.json`：strict モードが有効であること

### 完了条件

```bash
npm run dev
```

エラーなく起動し、ブラウザでデフォルトページが表示されること。

---

## フェーズ P1：型定義・定数

### 作成ファイル：`src/lib/types.ts`

```typescript
export type EmojiTag = ["emoji", string, string, string?];

export type Cell = EmojiTag | null;

export type Grid = Cell[][];

export interface PaletteEmoji {
  shortcode: string;
  url: string;
  ref?: string;
  originalShortcode: string;
}

export interface NullEmojiConfig {
  type: "custom" | "fullwidth_space";
  emoji?: PaletteEmoji;
}
```

### 作成ファイル：`src/lib/constants.ts`

```typescript
// ── 以下3箇所は確定した値に書き換えること ──────────────────────────────
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
// ────────────────────────────────────────────────────────────────────────

export const GRID_INITIAL_ROWS = 8;
export const GRID_INITIAL_COLS = 8;
export const GRID_MAX_ROWS = 64;
export const GRID_MAX_COLS = 64;

export const STORAGE_KEYS = {
  GRID: "hyptsukuru_grid",
  PALETTE: "hyptsukuru_palette",
  NULL_EMOJI: "hyptsukuru_null_emoji",
} as const;
```

### 完了条件

- `src/lib/types.ts` が型エラーなしでコンパイルされること
- `src/lib/constants.ts` が型エラーなしでコンパイルされること

---

## フェーズ P2：状態管理

### 作成ファイル：`src/lib/stores/grid.ts`

以下の状態と操作を実装する。

```typescript
import { writable, derived } from "svelte/store";
import type { Grid, Cell } from "$lib/types";
import { GRID_INITIAL_ROWS, GRID_INITIAL_COLS } from "$lib/constants";

function createGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

// gridStore：Grid（writable）
// 操作関数（すべてexport）：
//   setCell(row: number, col: number, cell: Cell): void
//   addRowBottom(): void
//   addRowTop(): void
//   addColRight(): void
//   addColLeft(): void
//   removeRow(row: number): void  ※配置済みチェックはコンポーネント側で行う
//   removeCol(col: number): void  ※同上
//   loadGrid(grid: Grid): void
```

### 作成ファイル：`src/lib/stores/palette.ts`

```typescript
// paletteStore：PaletteEmoji[]（writable）
// selectedEmojiStore：PaletteEmoji | null（writable）
// 操作関数：
//   selectEmoji(emoji: PaletteEmoji): void  ※同じ絵文字なら解除
//   deselectEmoji(): void
//   loadPalette(list: PaletteEmoji[]): void
```

### 作成ファイル：`src/lib/stores/nullEmoji.ts`

```typescript
// nullEmojiStore：NullEmojiConfig（writable）
// 初期値：{ type: "custom", emoji: { shortcode: NULL_EMOJI_SHORTCODE, url: NULL_EMOJI_URL, originalShortcode: NULL_EMOJI_SHORTCODE } }
```

### 作成ファイル：`src/lib/stores/auth.ts`

```typescript
// pubkeyStore：string | null（writable）
// isLoggedInStore：derived（pubkeyStore !== null）
```

### 完了条件

- 全storeが型エラーなしでコンパイルされること
- `setCell`・`addRowBottom`・`removeRow` の単体テストが通ること（Vitest使用）

---

## フェーズ P3：localStorage永続化

### 作成ファイル：`src/lib/storage.ts`

以下の関数を実装する。

```typescript
import { STORAGE_KEYS } from "$lib/constants";
import type { Grid, PaletteEmoji, NullEmojiConfig } from "$lib/types";

export function saveGrid(grid: Grid): void;
export function loadGrid(): Grid | null;
export function savePalette(list: PaletteEmoji[]): void;
export function loadPalette(): PaletteEmoji[] | null;
export function saveNullEmoji(config: NullEmojiConfig): void;
export function loadNullEmoji(): NullEmojiConfig | null;
```

- すべてtry-catchで囲む（localStorageが使用できない環境でもクラッシュしないこと）
- JSON.parseの型安全性を確保すること（不正なデータはnullとして返す）

### storeとの接続

`src/lib/stores/persistence.ts` を作成し、各storeの変更を購読してlocalStorageに自動保存する。

```typescript
// gridStore.subscribe → saveGrid
// paletteStore.subscribe → savePalette
// nullEmojiStore.subscribe → saveNullEmoji
```

### アプリ起動時の復元

`src/routes/+layout.svelte` の `onMount` で以下を実行する。

```typescript
// loadGrid() → gridStore にロード（nullの場合はデフォルトグリッド）
// loadPalette() → paletteStore にロード
// loadNullEmoji() → nullEmojiStore にロード
```

### 完了条件

- グリッドにセルを配置後、ページをリロードして配置が復元されること
- localStorage が利用不可な環境（プライベートブラウジング等）でクラッシュしないこと

---

## フェーズ P4：パレット絵文字取得ロジック

### 作成ファイル：`src/lib/nostr/fetchPalette.ts`

rx-nostr を使用して以下のフローを実装する。

#### ステップ1：kind 10002 の取得

```typescript
// constants.ts の BOOTSTRAP_RELAYS から pubkey の kind 10002 を取得する
// 10002 の 'r' タグ（readマーカー or マーカーなし）からリレーURLを収集する
// → readRelays: string[]
```

#### ステップ2：kind 10030 の取得

```typescript
// readRelays から pubkey の kind 10030 を取得する
// 見つからない場合は Error("10030 not found") をスローする
```

#### ステップ3：kind 30030 の取得

```typescript
// 10030 の 'a' タグを列挙する
// 各 'a' タグについて：
//   メイン：readRelays から kind 30030 を取得する
//   フォールバック：'a' タグのリレーヒントから取得する
```

#### ステップ4：絵文字の収集・衝突解消

```typescript
// 30030 の 'emoji' タグを収集する
// 10030 のノラ絵文字（直接の 'emoji' タグ）を収集する
// pubkey+dtag でソートして先勝ち衝突解消を適用する
// 後続には _2, _3 suffix を付与する
// → PaletteEmoji[] を返す
```

### エクスポート

```typescript
export async function fetchPaletteEmojis(
  pubkey: string,
): Promise<PaletteEmoji[]>;
```

### 完了条件

- 実際のpubkeyで呼び出し、PaletteEmoji[]が返ること（手動確認）
- 10030未所持の場合に適切なエラーがスローされること

---

## フェーズ P5：グリッドコンポーネント

### 作成ファイル：`src/lib/components/Grid.svelte`

#### 表示仕様

- `gridStore` から Grid を購読して描画する
- 各セルはカスタム絵文字画像（`<img>`）または空として表示する
- セルは正方形（CSSで `aspect-ratio: 1`）とする
- グリッド全体はスクロール可能なコンテナ内に配置する

#### タップ挙動の実装

REQUIREMENTS.md の GRID-04〜GRID-08 を実装する。

```typescript
function handleCellClick(row: number, col: number): void {
  // 要件定義のセルタップ挙動テーブルに従う
}
```

#### コンテキストメニューの表示位置

- クリック/タップ座標の近傍に表示する（青いポップアップ）
- グリッドコンポーネント内にコンテキストメニューのDOMを含める
- メニュー項目：「削除」「選択」（「選択」はクリックした絵文字を選択中の絵文字として使用する）

#### コンテキストメニューのトリガー

- 絵文字選択中 + 配置済みセル（同じ絵文字）をタップ
- 選択解除中 + 配置済みセルをタップ

### 完了条件

- 8×8グリッドが表示されること
- 絵文字選択中に空セルをクリックすると絵文字が配置されること
- 配置済みセルを同じ絵文字で再クリックするとコンテキストメニューが表示されること

---

## フェーズ P6：パレットコンポーネント

### 作成ファイル：`src/lib/components/Palette.svelte`

#### 表示仕様（スクロールスパイ型タブUI）

- `paletteStore` から絵文字リストを購読して描画する
- 各絵文字は `<img>` タグで表示する
- 選択中の絵文字はハイライト表示する
- スクロールスパイ型タブを使用する
  - グリッドのスクロール位置に合わせて、パレット内の対応するセクションが自動的にハイライトされる
  - タブをクリックするとパレットが該当セクションにスクロールする
- セクション例：
  - 「みんなの30030絵文字セット」（異なるpubkeyの30030から取得した絵文字）
  - 「自分の30030絵文字セット」（自分のpubkeyの30030から取得した絵文字）
  - 「10030に直入れしている絵文字」（10030に直接emojiタグで登録されているノラ絵文字）

#### 操作

- 絵文字クリック → `selectEmoji` / 同じ絵文字なら `deselectEmoji`
- 「選択解除」ボタン → `deselectEmoji`

#### 選択中絵文字プレビュー

- 選択中の絵文字をプレビューエリアに大きく表示する
- 選択なしの場合はプレビューエリアを空にする

### 完了条件

- パレットに絵文字リストが表示されること
- 絵文字をクリックするとプレビューエリアに表示されること
- 再クリックで選択解除されること

---

## フェーズ P7：コンテキストメニュー

### 作成ファイル：`src/lib/components/ContextMenu.svelte`

#### Props

```typescript
interface Props {
  cell: EmojiTag;
  position: { x: number; y: number };
  onClose: () => void;
}
```

#### メニュー項目

- **削除**：`setCell(row, col, null)` を呼び出す → `onClose()`
- **パレットにコピー**：`selectEmoji(cell に対応する PaletteEmoji)` を呼び出す → `onClose()`

#### 閉じる条件

- メニュー外クリックで閉じる
- いずれかのメニュー項目実行後に閉じる

### 完了条件

- 配置済みセルを条件に従ってクリックするとメニューが表示されること
- 「削除」でセルがnullになること
- 「パレットにコピー」でパレットの選択状態がそのセルの絵文字になること

---

## フェーズ P8：グリッドサイズ変更

### Grid.svelte への追加

#### `+` ボタンと `−` ボタン

グリッドの上・下・左・右に `+` ボタンを配置する。`+` ボタンの隣に `−` ボタンも配置する。

```typescript
// 下端+：gridStore.addRowBottom()
// 上端+：gridStore.addRowTop()
// 右端+：gridStore.addColRight()
// 左端+：gridStore.addColLeft()

// 下端−：gridStore.removeRow(末尾の行)
// 上端−：gridStore.removeRow(先頭の行)
// 右端−：gridStore.removeCol(末尾の列)
// 左端−：gridStore.removeCol(先頭の列)
```

#### 削除ボタン（詳細）

各行・列の削除ボタンを配置する。

- **PC**：ホバー時に削除ボタン（`−`）を表示
- **スマホ**：グリッド端に常時表示、タップで確認ダイアログ→削除

```typescript
function handleDeleteRow(row: number): void {
  const hasEmoji = gridStore.rowHasEmoji(row);
  if (hasEmoji) {
    // 確認ダイアログを表示する
    // ユーザーが確認後に removeRow(row) を実行する
  } else {
    gridStore.removeRow(row);
  }
}
// handleDeleteCol も同様
```

#### 最大サイズの制御

行数・列数が GRID_MAX_ROWS / GRID_MAX_COLS に達したら対応方向の `+` ボタンを disabled にする。

### 完了条件

- `+` ボタンで行・列が追加されること
- 削除ボタンで空行・空列が削除されること
- 配置済み絵文字を含む行の削除時にダイアログが表示されること

---

## フェーズ P9：スクロール

### 作成ファイル：`src/lib/actions/wasd.ts`

Svelte action として実装する。

```typescript
export function wasdScroll(node: HTMLElement): { destroy: () => void } {
  // keydown イベントで W/A/S/D を検知する
  // W: scrollTop -= cellSize * 2
  // S: scrollTop += cellSize * 2
  // A: scrollLeft -= cellSize * 2
  // D: scrollLeft += cellSize * 2
  // セルサイズは CSS変数またはconstantsから取得する
}
```

### Grid.svelte への適用

```svelte
<div class="grid-scroll-container" use:wasdScroll>
  <!-- グリッド本体 -->
</div>
```

### ⌨ ボタン

スマホ向けに非表示入力フィールドを配置し、⌨ ボタンでfocusする。

### 完了条件

- WASDキーでグリッドがスクロールすること
- マウスホイールでグリッドがスクロールすること

---

## フェーズ P10：null絵文字設定UI

### 作成ファイル：`src/lib/components/NullEmojiSetting.svelte`

#### 表示仕様

- 現在のnull絵文字を表示する
- 「パレットから選択」ボタン：クリックすると、次にパレットで選択した絵文字をnull絵文字に設定するモードになる
- 「全角スペース」オプション：非推奨として表示する（⚠アイコン + 「クライアント依存で幅がズレる可能性あり」の注記）
- 「デフォルトに戻す」ボタン：NULL_EMOJI_SHORTCODE / NULL_EMOJI_URL に戻す

### 完了条件

- null絵文字をパレット絵文字に変更できること
- 変更後にページをリロードしても設定が保持されること

---

## フェーズ P11：出力・投稿

### 作成ファイル：`src/lib/output.ts`

#### トリム処理

```typescript
export function trimGrid(grid: Grid): Grid {
  // 上端・下端・左端・右端のnullのみの行・列を除去する
  // 元のgridを変更しないこと（コピーを返す）
}
```

#### テキスト生成

```typescript
export function generateContent(
  grid: Grid,
  nullConfig: NullEmojiConfig,
): string {
  const trimmed = trimGrid(grid);
  // 各セルを :shortcode: に変換する
  // nullセルはnullConfigに従って変換する（全角スペースの場合は \u3000）
  // 各行を連結し \n で区切る
}
```

#### tags生成

```typescript
export function generateTags(
  grid: Grid,
  nullConfig: NullEmojiConfig,
): string[][] {
  // NIP-30準拠。["emoji", shortcode, url, "30030:pubhex:identifier"]（4要素目はノラ絵文字の場合省略）
  // 使用済み絵文字 + null絵文字を重複なく列挙する
  // EmojiTagの形式で返す
}
```

#### トリム後サイズ計算

```typescript
export function getTrimmedSize(grid: Grid): { cols: number; rows: number } {
  const trimmed = trimGrid(grid);
  return { cols: trimmed[0]?.length ?? 0, rows: trimmed.length };
}
```

### 作成ファイル：`src/lib/components/OutputPanel.svelte`

- トリム後サイズを表示する（例：`5列×3行`）
- 「contentをコピー」ボタン：`navigator.clipboard.writeText(generateContent(...))` を呼び出す
- 「kind 1で投稿」ボタン：@konemono/nostr-login で署名・投稿する

#### 投稿処理

```typescript
async function postKind1(): Promise<void> {
  const content = generateContent(grid, nullConfig);
  const tags = generateTags(grid, nullConfig);
  // nostr-login で署名する
  // 10002 の書きリレーに投稿する
  // 成功・失敗をUIに表示する
}
```

### 完了条件

- `trimGrid` の単体テストが通ること
- `generateContent` の単体テストが通ること（nullセル・全角スペースの両ケース含む）
- 「contentをコピー」ボタンでクリップボードにテキストがコピーされること

---

## フェーズ P12：ログイン統合

### 作成ファイル：`src/lib/components/LoginButton.svelte`

- @konemono/nostr-login のドキュメントに従いログインUIを実装する
- ログイン成功後：
  - pubkeyをpubkeyStoreにセットする
  - `fetchPaletteEmojis(pubkey)` を呼び出す
  - 成功した場合：paletteStoreにセットし、localStorageに保存する
  - 失敗した場合：エラーメッセージを表示する
- 10030未所持の場合：「10030が見つかりません。絵文字セットを設定してください。」と表示する

### 完了条件

- ログイン後にパレットに絵文字が表示されること
- 10030未所持の場合にエラーメッセージが表示されること

---

## フェーズ P13：レイアウト統合

### 修正ファイル：`src/routes/+layout.svelte`

```svelte
<script>
  import { onMount } from "svelte";
  import { loadGrid, loadPalette, loadNullEmoji } from "$lib/storage";
  import { gridStore, paletteStore, nullEmojiStore } from "$lib/stores";
  // 各storeの初期化
  // persistenceの購読開始
</script>
```

### 修正ファイル：`src/routes/+page.svelte`

PCレイアウト（768px超）とスマホレイアウト（768px以下）を実装する。

#### PCレイアウト

```
[LoginButton]
[Palette（左カラム）] [Grid（右カラム）]
                      [OutputPanel]
```

#### スマホレイアウト

```
[LoginButton]
[Grid]
[選択中絵文字プレビュー]
[Palette]
[OutputPanel]
```

### 完了条件（統合テスト）

以下の一連の操作がエラーなく完了すること：

1. アプリを開くとグリッドが表示される
2. ログインするとパレットに絵文字が表示される
3. パレットで絵文字を選択する
4. グリッドのセルをクリックして絵文字を配置する
5. 「contentをコピー」をクリックするとクリップボードに `:shortcode:` 形式のテキストがコピーされる
6. ページをリロードするとグリッドの内容が復元される

---

## 実装上の注意事項

### rx-nostr の使用方針

- `createRxNostr` はアプリ全体でシングルトンとして管理する
- リレー接続は必要なタイミングで行い、不要になったらclose/disposeする
- タイムアウト処理を必ず実装する（推奨：10秒）

### エラーハンドリング方針

- ネットワークエラーはUIにメッセージとして表示する（console.errorだけにしない）
- localStorage操作は常にtry-catchで囲む
- 型アサーション（`as`）を使う箇所は必ずコメントで理由を記載する

### CSS方針

- グリッドセルのサイズはCSS変数 `--cell-size` で一元管理する（初期値：48px）
- スマホ向けには `--cell-size` を小さく調整する（推奨：36px以下）
- コンポーネントのスタイルは `<style>` スコープを使用し、グローバルスタイルを汚染しない
