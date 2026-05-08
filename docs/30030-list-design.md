# 30030一覧ページ 設計仕様

## データ取得・処理フロー

### 1. 初回読み込み

- `createRxForwardReq()` でフォワード戦略
- `kinds: [30030], limit: 500, until: Date.now() / 1000` でreq
- pipe: `uniq(flushes$) → sortEvents() → timeline(500) → latestEach(dtagキー)`
- timelineの末尾のイベントの `created_at` を `until` として保持
- 表示: `created_at` が新しいものを上に表示

### 2. フォワード受信（裏で保持）

- フォワードで受信したイベントはリストに直接反映しない
- 裏で保持（BufferやStateで管理）
- ユーザーが編集中でもリストが変化しない

### 3. Loadmore

- Loadmore押下時、末尾の `created_at` を `until` に設定
- 上記処理を再実行
- 追加イベントのみをマージ

### 4. 更新（更新ボタン）

- 「更新」ボタン押下時にフォワードで受信した裏データをリストに反映
- 新しいdtag → リストに追加
- 既存dtagの更新 → リスト内のeventを更新
- 再ソートして表示

## 設計の意図

- フォワード戦略でリアルタイム受信（裏で保持）
- リストの更新はユーザーの明示的な操作（更新ボタン）でのみ発生
- ユーザーが編集中でもリストが勝手に変化しない
- `uniq()` でrelay重複除去
- `sortEvents()` + `timeline()` で作成順ソート→500件スライス
- スライスしてから `latestEach()` でdtagごとの比較
- NIP-01: kind 30030はaddressable（30000-39999）、同一kind+pubkey+dtagの組み合わせでは最新のみを保持
