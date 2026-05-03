<script lang="ts">
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { gridStore, paletteStore, nullEmojiStore } from "$lib/stores";
	import { pubkeyStore, isLoggedInStore } from "$lib/stores";
	import { loadGrid, loadPalette as loadPaletteStorage, loadNullEmoji } from "$lib/storage";
	import "$lib/stores/persistence";
	import { fetchPaletteEmojis } from "$lib/nostr/fetchPalette";
	import { loadPalette as loadPaletteStore } from "$lib/stores/palette";

	let { children } = $props();

	onMount(() => {
		// nostr-loginを初期化（asyncなので直接returnしない）
		(async () => {
			try {
				const { init } = await import("@konemono/nostr-login");
				await init({
					methods: ["connect", "extension", "readOnly", "local", "nsec"],
					startScreen: "welcome",
				});
				console.log("nostr-login initialized");
			} catch (e) {
				console.error("Failed to initialize nostr-login:", e);
			}
		})();

		// localStorageからデータを復元する
		const savedGrid = loadGrid();
		if (savedGrid) {
			gridStore.set(savedGrid);
		}

		const savedPalette = loadPaletteStorage();
		if (savedPalette) {
			paletteStore.set(savedPalette);
		}

		const savedNullEmoji = loadNullEmoji();
		if (savedNullEmoji) {
			nullEmojiStore.set(savedNullEmoji);
		}

		// nlAuthイベントを監視
		const handleAuthEvent = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			console.log("nlAuth event:", detail);

			if (detail?.type === "login" || detail?.type === "signup") {
				// window.nostrからpubkeyを取得
				if (window.nostr) {
					window.nostr
						.getPublicKey()
						.then((pubkey: string) => {
							console.log("Logged in with pubkey:", pubkey);
							pubkeyStore.set(pubkey);
							// パレット絵文字を取得
							fetchPaletteEmojis(pubkey)
								.then((emojis) => {
									console.log("Palette loaded:", emojis.length, "emojis");
									loadPaletteStore(emojis);
								})
								.catch((err) => {
									console.error("Failed to fetch palette:", err);
								});
						})
						.catch((err: unknown) => {
							console.error("Failed to get pubkey:", err);
						});
				}
			} else if (detail?.type === "logout") {
				pubkeyStore.set(null);
				loadPaletteStore([]);
			}
		};

		document.addEventListener("nlAuth", handleAuthEvent);

		// イベントリスナーをクリーンアップ
		return () => {
			document.removeEventListener("nlAuth", handleAuthEvent);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
