<script lang="ts">
  import LoginButton from "$lib/components/LoginButton.svelte";
  import Palette from "$lib/components/Palette.svelte";
  import Grid from "$lib/components/Grid.svelte";
  import OutputPanel from "$lib/components/OutputPanel.svelte";
  import NullEmojiSetting from "$lib/components/NullEmojiSetting.svelte";
  import { selectedEmojiStore, deselectEmoji, isMobile } from "$lib/stores";
  import { ChevronDown, ChevronUp, Settings } from "@lucide/svelte";

  let paletteOpen = $state(false);
  let settingsOpen = $state(false);
</script>

{#if $isMobile}
  <div class="mobile-layout">
    <div class="mobile-header">
      <LoginButton />
      <div class="flex items-center gap-2">
        {#if $selectedEmojiStore}
          <button
            class="mobile-preview"
            onclick={deselectEmoji}
            title="選択解除"
          >
            <img
              src={$selectedEmojiStore.url}
              alt={$selectedEmojiStore.shortcode}
            />
          </button>
        {/if}
        <button
          class="icon-button"
          onclick={() => (settingsOpen = true)}
          title="設定"><Settings /></button
        >
      </div>
    </div>
    <div class="mobile-main">
      <Grid />
      <OutputPanel />
    </div>

    <!-- ボトムシート -->
    <div class="bottom-sheet" class:open={paletteOpen}>
      <button class="sheet-toggle" onclick={() => (paletteOpen = !paletteOpen)}>
        {#if paletteOpen}
          <ChevronDown />
        {:else}
          <ChevronUp />
        {/if}
      </button>
      <div class="sheet-content">
        <Palette />
      </div>
    </div>
  </div>
{:else}
  <div class="pc-layout">
    <div class="header">
      <LoginButton />
      <h1 class="title">Nostr Custom Emoji ハイパーつくるくん</h1>
      {#if $selectedEmojiStore}
        <div
          class="pc-preview"
          onclick={deselectEmoji}
          title="タップで選択解除"
        >
          <img
            src={$selectedEmojiStore.url}
            alt={$selectedEmojiStore.shortcode}
          />
        </div>
        <button class="icon-button preview-deselect-btn" onclick={deselectEmoji}
          >選択解除</button
        >
      {/if}
      <button
        class="icon-button"
        onclick={() => (settingsOpen = true)}
        title="設定"><Settings /></button
      >
    </div>

    <div class="main-content">
      <div class="palette-column">
        <Palette />
      </div>

      <div class="grid-column">
        <Grid />
        <OutputPanel />
      </div>
    </div>
  </div>
{/if}

<!-- 設定モーダル -->
{#if settingsOpen}
  <div class="modal-backdrop" onclick={() => (settingsOpen = false)}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">設定</h2>
        <button class="modal-close" onclick={() => (settingsOpen = false)}
          >✕</button
        >
      </div>
      <div class="modal-body">
        <NullEmojiSetting />
      </div>
    </div>
  </div>
{/if}

<style>
  /* 共通 */
  * {
    box-sizing: border-box;
  }

  .icon-button {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }

  .icon-button:hover {
    background: #f0f0f0;
  }

  /* モバイルレイアウト */
  .mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .mobile-header {
    justify-content: space-between;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px;
    flex-shrink: 0;
  }

  .mobile-main {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ボトムシート */
  .bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: white;
    border-top: 1px solid #ccc;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    transition: height 0.3s ease;
    height: 48px;
    overflow: hidden;
  }

  .bottom-sheet.open {
    height: 60vh;
  }

  .sheet-toggle {
    place-items: center;
    display: block;
    width: 100%;
    height: 48px;
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    color: #555;
  }

  .sheet-toggle:hover {
    background: #f5f5f5;
  }

  .sheet-content {
    height: calc(100% - 48px);
    overflow-y: auto;
    padding: 0 8px 8px;
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
    gap: 8px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    flex: 1;
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

  /* 設定モーダル */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .modal {
    background: white;
    border-radius: 8px;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .modal-close {
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    color: #555;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .modal-close:hover {
    background: #f0f0f0;
  }

  .modal-body {
    padding: 16px;
    overflow-y: auto;
  }

  /* ヘッダー内プレビュー */
  .mobile-preview {
    width: 36px;
    height: 36px;
    border: 2px solid #00bcd4;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
  }

  .mobile-preview img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .mobile-preview:hover {
    border-color: #0097a7;
    background: #e0f7fa;
  }

  .pc-preview {
    width: 32px;
    height: 32px;
    border: 2px solid #00bcd4;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
  }

  .pc-preview img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .pc-preview:hover {
    border-color: #0097a7;
    background: #e0f7fa;
  }

  .preview-deselect-btn {
    font-size: 12px;
    padding: 4px 8px;
  }
</style>
