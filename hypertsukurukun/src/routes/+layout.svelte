<script lang="ts">
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { gridStore, paletteStore, nullEmojiStore } from "$lib/stores";
	import { loadGrid, loadPalette, loadNullEmoji } from "$lib/storage";
	import "$lib/stores/persistence";

	let { children } = $props();

	onMount(() => {
		// localStorageからデータを復元する
		const savedGrid = loadGrid();
		if (savedGrid) {
			gridStore.set(savedGrid);
		}

		const savedPalette = loadPalette();
		if (savedPalette) {
			paletteStore.set(savedPalette);
		}

		const savedNullEmoji = loadNullEmoji();
		if (savedNullEmoji) {
			nullEmojiStore.set(savedNullEmoji);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
