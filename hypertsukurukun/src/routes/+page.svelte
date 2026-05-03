<script lang="ts">
	import LoginButton from "$lib/components/LoginButton.svelte";
	import Palette from "$lib/components/Palette.svelte";
	import Grid from "$lib/components/Grid.svelte";
	import OutputPanel from "$lib/components/OutputPanel.svelte";
	import NullEmojiSetting from "$lib/components/NullEmojiSetting.svelte";

	let isMobile = $state(false);

	/** ビューポート幅を監視してMobile/PCを切り替え */
	function checkMobile(): void {
		isMobile = window.innerWidth <= 768;
	}

	$effect(() => {
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	});
</script>

{#if isMobile}
	<!-- スマホレイアウト（縦積み） -->
	<div class="mobile-layout">
		<LoginButton />
		<Grid />
		<Palette />
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
		overflow-y: auto;
	}

	.grid-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow: auto;
	}

	/* スマホ向けパレットカラムを狭く */
	@media (max-width: 768px) {
		.palette-column {
			flex: none;
		}
	}
</style>
