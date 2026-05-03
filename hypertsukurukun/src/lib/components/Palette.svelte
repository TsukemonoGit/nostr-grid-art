<script lang="ts">
	import { paletteSectionsStore, paletteStore, selectedEmojiStore, selectEmoji, deselectEmoji } from "$lib/stores";
	import type { PaletteEmoji, PaletteSection } from "$lib/types";

	let sections = $state<PaletteSection[]>([]);
	let flatList = $state<PaletteEmoji[]>([]);
	let selected = $state<PaletteEmoji | null>(null);
	let tabContainer = $state<HTMLDivElement | null>(null);
	let activeSection = $state("");

	/** セクションのDOM要素を取得 */
	function getSectionElement(label: string): HTMLDivElement | null {
		return tabContainer?.querySelector(`[data-section="${label}"]`) ?? null;
	}

	// ストアの購読
	paletteSectionsStore.subscribe((s) => { sections = s; });
	paletteStore.subscribe((p) => { flatList = p; });
	selectedEmojiStore.subscribe((s) => { selected = s; });

	/** 絵文字が存在するかチェック */
	function hasEmojis(): boolean {
		return flatList.length > 0 || sections.some((s) => s.emojis.length > 0);
	}

	function toggleEmoji(emoji: PaletteEmoji): void {
		selectEmoji(emoji);
	}

	/** 絵文字が選択されているかチェックする */
	function isSelected(emoji: PaletteEmoji): boolean {
		return selected?.shortcode === emoji.shortcode;
	}

	/** タブをクリックしたときに該当セクションにスクロール */
	function scrollToSection(sectionId: string): void {
		const el = getSectionElement(sectionId);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	/** スクロールスパイ：現在表示中のセクションを判定 */
	$effect(() => {
		if (!tabContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeSection = entry.target.getAttribute("data-section") ?? "";
					}
				}
			},
			{ root: tabContainer, threshold: 0.3 },
		);

		const elements = tabContainer.querySelectorAll(".section");
		for (const el of elements) {
			observer.observe(el);
		}

		return () => observer.disconnect();
	});
</script>

<div class="palette-container">
	{#if hasEmojis()}
		<h3 class="palette-title">パレット</h3>

		<!-- タブナビゲーション（セクションがある場合のみ表示） -->
		{#if sections.length > 0}
			<div class="tab-nav" bind:this={tabContainer}>
				{#each sections as section}
					<button
						class={"tab-btn" + (activeSection === section.label ? " active" : "")}
						onclick={() => scrollToSection(section.label)}
						data-section={section.label}
					>
						{section.label}
					</button>
				{/each}
			</div>
		{/if}

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

		<!-- セクション付き絵文字リスト -->
		{#if sections.length > 0}
			<div class="emoji-list">
				{#each sections as section}
					<div class="section" data-section={section.label}>
						{#if section.emojis.length > 0}
							<h4 class="section-title">{section.label}</h4>
							<div class="emoji-grid">
								{#each section.emojis as emoji}
									<button
										class={"emoji-item" + (isSelected(emoji) ? " selected" : "")}
										onclick={() => toggleEmoji(emoji)}
										aria-label={`絵文字 ${emoji.shortcode} を選択`}
									>
										<img src={emoji.url} alt={emoji.shortcode} loading="lazy" />
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<!-- フラットリスト（セクションなしのフォールバック） -->
			<div class="emoji-list">
				<div class="emoji-grid">
					{#each flatList as emoji}
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
		{/if}
	{/if}
</div>

<style>
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 100%;
	}

	.palette-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	/* タブナビゲーション */
	.tab-nav {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		padding: 4px 0;
		border-bottom: 1px solid #e0e0e0;
	}

	.tab-btn {
		flex-shrink: 0;
		padding: 6px 12px;
		border: none;
		border-radius: 4px 4px 0 0;
		background: #f5f5f5;
		color: #666;
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.2s, color 0.2s;
	}

	.tab-btn:hover {
		background: #e0e0e0;
		color: #333;
	}

	.tab-btn.active {
		background: white;
		color: #0066cc;
		font-weight: 600;
		border: 1px solid #e0e0e0;
		border-bottom: 1px solid white;
		margin-bottom: -1px;
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
		flex-direction: column;
		gap: 12px;
		overflow-y: auto;
		flex: 1;
	}

	.section {
		padding: 4px 0;
	}

	.section-title {
		margin: 0 0 8px 0;
		font-size: 13px;
		font-weight: 600;
		color: #555;
		padding-bottom: 4px;
		border-bottom: 1px solid #eee;
	}

	.emoji-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
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
