<script lang="ts">
	import { paletteSectionsStore, paletteStore, selectedEmojiStore, selectEmoji } from "$lib/stores";
	import type { PaletteEmoji, PaletteSection } from "$lib/types";

	let sections = $state<PaletteSection[]>([]);
	let flatList = $state<PaletteEmoji[]>([]);
	let tabContainer = $state<HTMLDivElement | null>(null);
	let activeSection = $state("");
	let searchQuery = $state("");

	paletteSectionsStore.subscribe((s) => { sections = s; });
	paletteStore.subscribe((p) => { flatList = p; });

	/** 検索フィルタ済みセクション */
	let filteredSections = $derived(
		searchQuery.trim() === ""
			? sections
			: sections
				.map((s) => ({
					...s,
					emojis: s.emojis.filter((e) =>
						e.shortcode.toLowerCase().includes(searchQuery.toLowerCase()),
					),
				}))
				.filter((s) => s.emojis.length > 0),
	);

	/** 検索フィルタ済みフラットリスト */
	let filteredFlatList = $derived(
		searchQuery.trim() === ""
			? flatList
			: flatList.filter((e) =>
				e.shortcode.toLowerCase().includes(searchQuery.toLowerCase()),
			),
	);

	function isSelected(emoji: PaletteEmoji): boolean {
		return $selectedEmojiStore?.shortcode === emoji.shortcode;
	}

	function toggleEmoji(emoji: PaletteEmoji): void {
		selectEmoji(emoji);
	}

	function scrollToSection(sectionLabel: string): void {
		if (!tabContainer) return;
		const emojiList = tabContainer.querySelector(".emoji-list");
		if (!emojiList) return;
		const el = emojiList.querySelector(`[data-section="${sectionLabel}"]`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	function truncateLabel(label: string, maxWidth: number = 180): string {
		if (label.length <= 20) return label;
		return label.slice(0, 15) + "..." + label.slice(-4);
	}

	function hasEmojis(): boolean {
		return flatList.length > 0 || sections.some((s) => s.emojis.length > 0);
	}

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

<div class="palette-container" bind:this={tabContainer}>
	{#if hasEmojis()}
		<h3 class="palette-title">パレット</h3>

		<!-- 検索欄 -->
		<input
			class="search-input"
			type="search"
			placeholder="shortcodeで検索..."
			bind:value={searchQuery}
		/>

		<!-- タブナビゲーション（検索中は非表示） -->
		{#if sections.length > 0 && searchQuery.trim() === ""}
			<div class="tab-nav">
				{#each sections as section}
					<button
						class={"tab-btn" + (activeSection === section.label ? " active" : "")}
						onclick={() => scrollToSection(section.label)}
						data-section={section.label}
						title={section.label}
					>
						{truncateLabel(section.label)}
					</button>
				{/each}
			</div>
		{/if}

		<!-- セクション付き絵文字リスト -->
		{#if filteredSections.length > 0}
			<div class="emoji-list">
				{#each filteredSections as section}
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
		{:else if filteredFlatList.length > 0}
			<div class="emoji-list">
				<div class="emoji-grid">
					{#each filteredFlatList as emoji}
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
		{:else if searchQuery.trim() !== ""}
			<div class="no-results">「{searchQuery}」に一致する絵文字はありません</div>
		{/if}
	{/if}
</div>

<style>
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		height: 100%;
	}

	.palette-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.search-input {
		width: 100%;
		padding: 6px 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 13px;
		box-sizing: border-box;
	}

	.search-input:focus {
		outline: none;
		border-color: #0066cc;
	}

	.no-results {
		font-size: 13px;
		color: #888;
		text-align: center;
		padding: 16px 0;
	}

	.tab-nav {
		gap: 4px;
		display: flex;
		flex-wrap: wrap;
		overflow-x: auto;
		padding: 4px 0;
		border-bottom: 1px solid #e0e0e0;
		max-height: 6em;
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

	.emoji-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
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