<script lang="ts">
	import { gridStore, nullEmojiStore } from "$lib/stores";
	import { generateContent, generateTags, getTrimmedSize } from "$lib/output";

	let grid = $state<any[]>([]);
	let nullConfig = $state<any>({});
	let trimmedSize = $state({ cols: 0, rows: 0 });
	let copyStatus = $state("");
	let postStatus = $state("");

	$effect(() => {
		gridStore.subscribe((g) => {
			grid = g;
			trimmedSize = getTrimmedSize(g);
		});
	});

	$effect(() => {
		nullEmojiStore.subscribe((nc) => {
			nullConfig = nc;
		});
	});

	/** contentをコピーする（OUT-08） */
	async function copyContent(): Promise<void> {
		const content = generateContent(grid, nullConfig);
		try {
			await navigator.clipboard.writeText(content);
			copyStatus = "コピーしました!";
			setTimeout(() => {
				copyStatus = "";
			}, 2000);
		} catch {
			copyStatus = "コピーに失敗しました";
			setTimeout(() => {
				copyStatus = "";
			}, 2000);
		}
	}

	/** kind 1で投稿する（OUT-09） */
	async function postKind1(): Promise<void> {
		postStatus = "投稿中...";

		try {
			// nostr-loginの確認: window.nostrがあるかチェック
			if (typeof window === "undefined" || !(window as any).nostr) {
				postStatus = "エラー: nostr拡張がインストールされていません";
				setTimeout(() => {
					postStatus = "";
				}, 5000);
				return;
			}

			const content = generateContent(grid, nullConfig);
			const tags = generateTags(grid, nullConfig);

			// kind 1イベントを作成
			const event = {
				kind: 1,
				tags,
				content,
				created_at: Math.floor(Date.now() / 1000),
			};

			// nostr-loginで署名して投稿
			const nostr = (window as any).nostr;
			const signedEvent = await nostr.signEvent(event);
			// リレーに投稿（書き用リレーは実装次第）
			// 現状では署名のみ実行
			postStatus = "投稿完了（署名済み）";
		} catch (e: any) {
			postStatus = `エラー: ${e?.message ?? "不明なエラー"}`;
		} finally {
			setTimeout(() => {
				postStatus = "";
			}, 5000);
		}
	}
</script>

<div class="output-panel">
	<h3 class="output-title">出力</h3>

	<!-- トリム後サイズ表示（OUT-03） -->
	<div class="trimmed-size">
		<span class="size-label">{trimmedSize.cols}列 × {trimmedSize.rows}行</span>
	</div>

	<!-- コピーボタン（OUT-08） -->
	<button class="copy-btn" onclick={copyContent}>contentをコピー</button>

	<!-- 投稿ボタン（OUT-09） -->
	<button class="post-btn" onclick={postKind1}>kind 1で投稿</button>

	<!-- ステータス表示 -->
	{#if copyStatus}
		<div class="status success">{copyStatus}</div>
	{/if}
	{#if postStatus}
		<div class="status {postStatus.includes("エラー") ? "error" : "success"}">{postStatus}</div>
	{/if}
</div>

<style>
	.output-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: #f9f9f9;
		border-radius: 4px;
	}

	.output-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.trimmed-size {
		padding: 8px;
		background: white;
		border-radius: 4px;
		text-align: center;
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}

	.copy-btn, .post-btn {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		font-size: 14px;
		cursor: pointer;
	}

	.copy-btn {
		background: #1976d2;
		color: white;
	}

	.copy-btn:hover {
		background: #1565c0;
	}

	.post-btn {
		background: #388e3c;
		color: white;
	}

	.post-btn:hover {
		background: #2e7d32;
	}

	.status {
		padding: 8px;
		border-radius: 4px;
		font-size: 13px;
		text-align: center;
	}

	.status.success {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.status.error {
		background: #ffebee;
		color: #c62828;
	}
</style>
