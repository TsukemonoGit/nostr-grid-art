<script lang="ts">
	import { pubkeyStore, isLoggedInStore } from "$lib/stores";
	import { fetchPaletteEmojis } from "$lib/nostr/fetchPalette";
	import { loadPalette } from "$lib/stores/palette";

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
			if (v && pubkey) {
				loginStatus = "ログインしました";
				setTimeout(() => {
					loginStatus = "";
				}, 2000);
			}
		});
	});

	/** ログインする */
	async function handleLogin(): Promise<void> {
		isLoading = true;
		loginStatus = "ログイン中...";

		try {
			// nostr-loginのlaunch関数で認証ダイアログを表示
			const { launch } = await import("@konemono/nostr-login");
			await launch("welcome");
		} catch (e: any) {
			console.error("Login failed:", e);
			loginStatus = "ログインに失敗しました";
			isLoading = false;
		}
	}

	/** ログアウトする */
	async function handleLogout(): Promise<void> {
		try {
			const { logout } = await import("@konemono/nostr-login");
			await logout();
		} catch (e) {
			console.error("Logout failed:", e);
		}

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
		<div class="status {loginStatus.includes("エラー") || loginStatus.includes("失敗") ? "error" : "success"}">{loginStatus}</div>
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
