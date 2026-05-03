<script lang="ts">
	import { pubkeyStore, isLoggedInStore } from "$lib/stores";
	import { fetchPaletteEmojis } from "$lib/nostr/fetchPalette";
	import { loadPaletteSections, loadPalette } from "$lib/stores/palette";

	let pubkey = $state<string | null>(null);
	let loginStatus = $state("");
	let isLoading = $state(false);

	$effect(() => {
		pubkeyStore.subscribe((p) => {
			pubkey = p;
		});
	});

	$effect(() => {
		isLoggedInStore.subscribe((v) => {
			isLoading = false;
		});
	});

	/** ログインする */
	async function handleLogin(): Promise<void> {
		loginStatus = "ログイン中...";
		isLoading = true;

		try {
			// @konemono/nostr-login を使用してログイン
			const { login } = await import("@konemono/nostr-login");
			const result = await login();

			if (result.pubkey) {
				pubkeyStore.set(result.pubkey);
				loginStatus = "ログインしました";

				// パレット絵文字を取得
				await fetchPaletteEmojis(result.pubkey);
			} else {
				loginStatus = "ログインに失敗しました";
			}
		} catch (e: any) {
			loginStatus = `エラー: ${e?.message ?? "不明なエラー"}`;
		} finally {
			isLoading = false;
			setTimeout(() => {
				loginStatus = "";
			}, 3000);
		}
	}

	/** ログアウトする */
	function handleLogout(): void {
		pubkeyStore.set(null);
		loadPalette([]);
		loginStatus = "ログアウトしました";
		setTimeout(() => {
			loginStatus = "";
		}, 2000);
	}
</script>

<div class="login-panel">
	{#if pubkey}
		<div class="user-info">
			<span class="user-label">ログイン中: {pubkey.slice(0, 8)}...</span>
			<button class="logout-btn" onclick={handleLogout}>ログアウト</button>
		</div>
	{:else}
		<button class="login-btn" onclick={handleLogin} disabled={isLoading}>
			{isLoading ? "ログイン中..." : "Nostrでログイン"}
		</button>
	{/if}

	{#if loginStatus}
		<div class="status {loginStatus.includes("エラー") ? "error" : "success"}">{loginStatus}</div>
	{/if}
</div>

<style>
	.login-panel {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.user-label {
		font-size: 13px;
		color: #333;
	}

	.login-btn, .logout-btn {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		font-size: 13px;
		cursor: pointer;
	}

	.login-btn {
		background: #1976d2;
		color: white;
	}

	.login-btn:hover:not(:disabled) {
		background: #1565c0;
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.logout-btn {
		background: #e0e0e0;
		color: #333;
	}

	.logout-btn:hover {
		background: #bdbdbd;
	}

	.status {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
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
