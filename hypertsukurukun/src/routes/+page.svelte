<script lang="ts">
	import LoginButton from "$lib/components/LoginButton.svelte";
	import Palette from "$lib/components/Palette.svelte";
	import Grid from "$lib/components/Grid.svelte";
	import OutputPanel from "$lib/components/OutputPanel.svelte";
	import NullEmojiSetting from "$lib/components/NullEmojiSetting.svelte";
	import { selectedEmojiStore, deselectEmoji } from "$lib/stores";

	let isMobile = $state(false);
</script>

{#if isMobile}
	<!-- スマホレイアウト（縦積み） -->
	<div class="mobile-layout">
		<LoginButton />
		<Grid />
		<Palette />
		<!-- 選択中絵文字プレビュー -->
		{#if $selectedEmojiStore}
			<div class="selected-preview">
				<img src={$selectedEmojiStore.url} alt={$selectedEmojiStore.shortcode} />
				<span class="preview-shortcode">:{ $selectedEmojiStore.shortcode }:</span>
				<button class="preview-deselect" onclick={deselectEmoji}>選択解除</button>
			</div>
		{/if}
		<OutputPanel />
		<NullEmojiSetting />
	</div>
{:else}
	<!-- PCレイアウト（横並び） -->
	<div class="pc-layout">
		<div class="header">
			<LoginButton />
			<h1 class="title">Nostr Custom Emoji ハイパーつくるくん</h1>
		</div>

		<div class="main-content">
			<div class="palette-column">
				<Palette />
				<!-- 選択中絵文字プレビュー -->
				{#if $selectedEmojiStore}
					<div class="selected-preview">
						<img src={$selectedEmojiStore.url} alt={$selectedEmojiStore.shortcode} />
						<span class="preview-shortcode">:{ $selectedEmojiStore.shortcode }:</span>
						<button class="preview-deselect" onclick={deselectEmoji}>選択解除</button>
					</div>
				{/if}
				<NullEmojiSetting />
			</div>
			<div class="grid-column">
				<Grid />
				<OutputPanel />
			</div>
		</div>
	</div>
{/if}

<style>
	/* 共通 */
	* {
		box-sizing: border-box;
	}

	.mobile-layout {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		max-width: 100%;
	}

	/* PCレイアウト */
	.pc-layout {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		height: 100vh;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 12px;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #333;
	}

	.main-content {
		display: flex;
		gap: 16px;
		flex: 1;
		overflow: hidden;
	}

	.palette-column {
		flex: 0 0 300px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.grid-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow: hidden;
	}

	/* スマホ向けパレットカラムを狭く */
	@media (max-width: 768px) {
		.palette-column {
			flex: none;
		}
	}

	/* 選択中絵文字プレビュー */
	.selected-preview {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.selected-preview img {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}

	.preview-shortcode {
		font-family: monospace;
		font-size: 14px;
		color: #555;
		flex: 1;
	}

	.preview-deselect {
		padding: 4px 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 13px;
	}

	.preview-deselect:hover {
		background: #f0f0f0;
	}
</style>
