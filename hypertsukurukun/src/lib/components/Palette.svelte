<script lang="ts">
	import { paletteStore, selectedEmojiStore, selectEmoji, deselectEmoji } from "$lib/stores";
	import type { PaletteEmoji } from "$lib/types";

	let palette = $state<PaletteEmoji[]>([]);
	let selected = $state<PaletteEmoji | null>(null);

	$effect(() => {
		paletteStore.subscribe((p) => {
			palette = p;
		});
	});

	$effect(() => {
		selectedEmojiStore.subscribe((s) => {
			selected = s;
		});
	});

	function toggleEmoji(emoji: PaletteEmoji): void {
		selectEmoji(emoji);
	}

	/** 絵文字が選択されているかチェックする */
	function isSelected(emoji: PaletteEmoji): boolean {
		return selected?.shortcode === emoji.shortcode;
	}
</script>

<div class="palette-container">
	<h3 class="palette-title">パレット</h3>

	<!-- 選択中絵文字プレビュー -->
	{#if selected}
		<div class="preview">
			<img src={selected.url} alt={selected.shortcode} />
			<span class="preview-shortcode">:{selected.shortcode}:</span>
		</div>
	{/if}

	<!-- 選択解除ボタン -->
	{#if selected}
		<button class="deselect-btn" onclick={deselectEmoji}>選択解除</button>
	{/if}

	<!-- 絵文字リスト -->
	<div class="emoji-list">
		{#each palette as emoji}
			<button
				class={"emoji-item" + (isSelected(emoji) ? " selected" : "")}
				onclick={() => toggleEmoji(emoji)}
				aria-label={`絵文字 ${emoji.shortcode} を選択`}
			>
				<img src={emoji.url} alt={emoji.shortcode} loading="lazy" />
			</button>
		{/each}
	</div>
</div>

<style>
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.palette-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.preview img {
		width: 64px;
		height: 64px;
		object-fit: contain;
	}

	.preview-shortcode {
		font-family: monospace;
		font-size: 14px;
		color: #555;
	}

	.deselect-btn {
		padding: 6px 12px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 14px;
	}

	.deselect-btn:hover {
		background: #f0f0f0;
	}

	.emoji-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		max-height: 400px;
		overflow-y: auto;
	}

	.emoji-item {
		width: var(--cell-size, 48px);
		height: var(--cell-size, 48px);
		border: 2px solid transparent;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		padding: 2px;
	}

	.emoji-item img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.emoji-item.selected {
		border-color: #0066cc;
		background: #e6f0ff;
	}
</style>
