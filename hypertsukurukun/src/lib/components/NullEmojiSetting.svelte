<script lang="ts">
  import {
    nullEmojiStore,
    selectedEmojiStore,
    selectEmoji,
    deselectEmoji,
  } from "$lib/stores";
  import type { PaletteEmoji } from "$lib/types";
  import { NULL_EMOJI_SHORTCODE, NULL_EMOJI_URL } from "$lib/constants";

  let paletteEmojiMode = $state(false);
  let currentSelected = $state<PaletteEmoji | null>(null);

  $effect(() => {
    selectedEmojiStore.subscribe((s) => {
      currentSelected = s;
    });
  });

  /** 選択中のパレット絵文字をnull絵文字に設定する */
  function handlePaletteSelect(emoji: PaletteEmoji): void {
    nullEmojiStore.update((nc) => ({
      type: "custom",
      emoji: {
        shortcode: emoji.shortcode,
        url: emoji.url,
        originalShortcode: emoji.originalShortcode,
        ref: emoji.ref,
      },
    }));
    paletteEmojiMode = false;
    deselectEmoji();
  }

  /** パレットから選択するモードに切り替える */
  function startPaletteSelection(): void {
    paletteEmojiMode = true;
  }

  /** 全角スペースに変更する（NULL-04: 非推奨として明示） */
  function setFullwidthSpace(): void {
    nullEmojiStore.set({
      type: "fullwidth_space",
    });
    paletteEmojiMode = false;
    deselectEmoji();
  }

  /** デフォルトに戻す */
  function resetToDefault(): void {
    nullEmojiStore.set({
      type: "custom",
      emoji: {
        shortcode: NULL_EMOJI_SHORTCODE,
        url: NULL_EMOJI_URL,
        originalShortcode: NULL_EMOJI_SHORTCODE,
      },
    });
    paletteEmojiMode = false;
    deselectEmoji();
  }

  /** 現在のnull絵文字の表示テキストを生成する */
  function getNullEmojiLabel(): string {
    if ($nullEmojiStore.type === "fullwidth_space") {
      return "全角スペース (\\u3000)";
    }
    return $nullEmojiStore.emoji?.shortcode ?? NULL_EMOJI_SHORTCODE;
  }
</script>

<div class="null-emoji-setting">
  <h3 class="setting-title">null絵文字設定</h3>

  <div class="current-null">
    {#if $nullEmojiStore.type === "custom" && $nullEmojiStore.emoji}
      <img
        src={$nullEmojiStore.emoji.url}
        alt={$nullEmojiStore.emoji.shortcode}
        class="null-preview"
      />
    {/if}
    <span class="null-label">:{getNullEmojiLabel()}:（null絵文字）</span>
  </div>

  <div class="selection-preview">
    <p class="selection-hint">選択中の絵文字をnull絵文字に設定</p>
    {#if currentSelected}
      <div
        class="selected-emoji"
        onclick={() => handlePaletteSelect(currentSelected!)}
        role="button"
        tabindex="0"
        onkeydown={(e) =>
          e.key === "Enter" && handlePaletteSelect(currentSelected!)}
      >
        <img src={currentSelected.url} alt={currentSelected.shortcode} />
        <span>クリックしてnull絵文字に設定</span>
      </div>
    {/if}
  </div>

  <!-- 全角スペースオプション（NULL-04: 非推奨） -->
  <div class="fullwidth-option">
    <button class="fullwidth-btn" onclick={setFullwidthSpace}>
      <span class="warning-icon">⚠</span>
      全角スペース
    </button>
    <p class="fullwidth-warning">
      クライアント依存で幅がズレる可能性があります
    </p>
  </div>

  <!-- デフォルトに戻す -->
  <button class="reset-btn" onclick={resetToDefault}>デフォルトに戻す</button>
</div>

<style>
  .null-emoji-setting {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .setting-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .current-null {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: white;
    border-radius: 4px;
  }

  .null-preview {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .null-label {
    font-family: monospace;
    font-size: 14px;
    color: #555;
  }

  .select-btn {
    padding: 6px 12px;
    border: 1px solid #1976d2;
    border-radius: 4px;
    background: white;
    color: #1976d2;
    cursor: pointer;
    font-size: 14px;
  }

  .select-btn:hover {
    background: #e3f2fd;
  }

  .selection-preview {
    padding: 8px;
    background: #fff3e0;
    border-radius: 4px;
  }

  .selection-hint {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #e65100;
  }

  .selected-emoji {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .selected-emoji:hover {
    background: #f5f5f5;
  }

  .selected-emoji img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .fullwidth-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fullwidth-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid #ff9800;
    border-radius: 4px;
    background: white;
    color: #e65100;
    cursor: pointer;
    font-size: 14px;
  }

  .fullwidth-btn:hover {
    background: #fff3e0;
  }

  .warning-icon {
    font-size: 16px;
  }

  .fullwidth-warning {
    margin: 0;
    font-size: 12px;
    color: #999;
  }

  .reset-btn {
    padding: 6px 12px;
    border: 1px solid #9e9e9e;
    border-radius: 4px;
    background: white;
    color: #666;
    cursor: pointer;
    font-size: 14px;
  }

  .reset-btn:hover {
    background: #f5f5f5;
  }
</style>
