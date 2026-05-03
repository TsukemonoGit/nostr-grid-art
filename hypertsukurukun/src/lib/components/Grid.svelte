<script lang="ts">
	import { gridStore, selectedEmojiStore, setCell, addRowBottom, addRowTop, addColRight, addColLeft, removeRow, removeCol, rowHasEmoji, colHasEmoji, loadGrid } from "$lib/stores";
	import { selectEmoji } from "$lib/stores/palette";
	import type { EmojiTag, PaletteEmoji, Grid } from "$lib/types";
	import { GRID_MAX_ROWS, GRID_MAX_COLS } from "$lib/constants";

	// Svelte storesから値を購読
	let grid = $state<Grid>([]);
	let selectedEmoji = $state<PaletteEmoji | null>(null);
	let contextMenu = $state<{ row: number; col: number; x: number; y: number } | null>(null);
	let scrollContainer: HTMLDivElement | null = null;

	$effect(() => {
		gridStore.subscribe((g) => {
			grid = g;
		});
	});

	$effect(() => {
		selectedEmojiStore.subscribe((e) => {
			selectedEmoji = e;
		});
	});

	/** セルクリック時の処理（要件GRID-04〜GRID-08） */
	function handleCellClick(row: number, col: number, e: MouseEvent): void {
		const cell = grid[row]?.[col] ?? null;

		// コンテキストメニューが既に開いている場合は閉じる
		if (contextMenu) {
			contextMenu = null;
		}

		// 絵文字選択中の場合
		if (selectedEmoji) {
			if (!cell) {
				// GRID-04: 空セル → 絵文字を配置
				const tag: EmojiTag = [
					"emoji",
					selectedEmoji.shortcode,
					selectedEmoji.url,
					selectedEmoji.ref,
				];
				setCell(row, col, tag);
			} else if (cell[1] === selectedEmoji.shortcode) {
				// GRID-06: 同じ絵文字 → コンテキストメニューを表示
				contextMenu = { row, col, x: e.clientX, y: e.clientY };
			} else {
				// GRID-05: 別の絵文字 → 上書き
				const tag: EmojiTag = [
					"emoji",
					selectedEmoji.shortcode,
					selectedEmoji.url,
					selectedEmoji.ref,
				];
				setCell(row, col, tag);
			}
		} else {
			// 選択解除中の場合
			if (cell) {
				// GRID-07: 配置済みセル → コンテキストメニューを表示
				contextMenu = { row, col, x: e.clientX, y: e.clientY };
			}
			// GRID-08: 空セル → 何もしない
		}
	}

	/** グリッド背景クリックでコンテキストメニューを閉じる */
	function handleBackgroundClick(): void {
		contextMenu = null;
	}

	/** コンテキストメニューを閉じる */
	function closeContextMenu(): void {
		contextMenu = null;
	}

	/** セルを削除する（CTX-01） */
	function deleteCell(row: number, col: number): void {
		setCell(row, col, null);
		closeContextMenu();
	}

	/** セルの絵文字を選択として使用（CTX-02: その絵文字を選択中に設定） */
	function useAsSelected(row: number, col: number): void {
		const cell = grid[row]?.[col];
		if (!cell || cell[0] !== "emoji") return;

		const paletteEmoji: PaletteEmoji = {
			shortcode: cell[1],
			url: cell[2],
			ref: cell[3],
			originalShortcode: cell[1],
		};

		selectEmoji(paletteEmoji);
		closeContextMenu();
	}

	/** 行削除処理（RSZ-06, RSZ-07） */
	function handleDeleteRow(row: number): void {
		if (rowHasEmoji(grid, row)) {
			// 配置済み絵文字がある場合は確認ダイアログ
			if (confirm("この行には絵文字が配置されています。削除してもよろしいですか？")) {
				removeRow(row);
			}
		} else {
			removeRow(row);
		}
	}

	/** 列削除処理 */
	function handleDeleteCol(col: number): void {
		if (colHasEmoji(grid, col)) {
			if (confirm("この列には絵文字が配置されています。削除してもよろしいですか？")) {
				removeCol(col);
			}
		} else {
			removeCol(col);
		}
	}

	/** RSZ-02: 下端に行を追加 */
	function handleAddRowBottom(): void {
		addRowBottom();
	}

	/** RSZ-03: 右端に列を追加 */
	function handleAddColRight(): void {
		addColRight();
	}

	/** RSZ-04: 上端に行を挿入 */
	function handleAddRowTop(): void {
		addRowTop();
	}

	/** RSZ-05: 左端に列を挿入 */
	function handleAddColLeft(): void {
		addColLeft();
	}

	/** WASDスクロール（SCR-01） */
	function handleKeydown(e: KeyboardEvent): void {
		if (!scrollContainer) return;
		const amount = 20;
		switch (e.key.toLowerCase()) {
			case "w":
				scrollContainer.scrollTop -= amount;
				break;
			case "s":
				scrollContainer.scrollTop += amount;
				break;
			case "a":
				scrollContainer.scrollLeft -= amount;
				break;
			case "d":
				scrollContainer.scrollLeft += amount;
				break;
		}
	}

	/** SCR-03: スマホ向けキーボードボタン */
	function focusKeyboardInput(): void {
		const input = document.getElementById("keyboard-input");
		input?.focus();
	}
</script>

<div class="grid-wrapper" role="grid" onclick={handleBackgroundClick} tabindex="0" onkeydown={handleKeydown} aria-label="絵文字グリッド">
	<!-- グリッドエリア（上下左右に＋/−ボタン付き） -->
	<div class="grid-outer">
		<!-- 上端：上に行を追加/削除ボタン -->
		<div class="resize-bar top">
			<button
				class="resize-btn remove"
				onclick={() => handleDeleteRow(0)}
				disabled={grid.length <= 1}
				aria-label="上端の行を削除"
			>
				−
			</button>
			<button
				class="resize-btn add"
				onclick={handleAddRowTop}
				disabled={grid.length >= GRID_MAX_ROWS}
				aria-label="上に行を挿入"
			>
				+
			</button>
		</div>

		<!-- 中央エリア：左端＋グリッド -->
		<div class="grid-center">
			<!-- 左端：左に列を挿入/追加ボタン -->
			<div class="resize-bar left">
				<button
					class="resize-btn remove"
					onclick={() => handleDeleteCol(0)}
					disabled={grid[0]?.length <= 1}
					aria-label="左端の列を削除"
				>
					−
				</button>
				<button
					class="resize-btn add"
					onclick={handleAddColLeft}
					disabled={grid[0]?.length >= GRID_MAX_COLS}
					aria-label="左に列を挿入"
				>
					+
				</button>
			</div>

			<!-- グリッド本体 -->
			<div class="grid-scroll-container" bind:this={scrollContainer}>
				<table class="grid">
					<tbody>
						{#each grid as row, rowIndex}
							<tr>
								{#each row as cell, colIndex}
									<td
										class="cell"
										role="gridcell"
										aria-label={cell ? `絵文字 ${cell[1]}` : "空セル"}
										onclick={(e) => handleCellClick(rowIndex, colIndex, e)}
									>{#if cell && cell[0] === "emoji"}
											<img src={cell[2]} alt={cell[1]} loading="lazy" />{/if}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
	
		<!-- 右端：右に列を追加/削除ボタン -->
		<div class="resize-bar right">
			<button
				class="resize-btn remove"
				onclick={() => {
					const cols = grid[0]?.length ?? 0;
					handleDeleteCol(cols - 1);
				}}
				disabled={grid[0]?.length <= 1}
				aria-label="右端の列を削除"
			>
				−
			</button>
			<button
				class="resize-btn add"
				onclick={handleAddColRight}
				disabled={grid[0]?.length >= GRID_MAX_COLS}
				aria-label="右に列を追加"
			>
				+
			</button>
		</div>
	</div>
	</div>
	<!-- 下端：下に行を追加/削除ボタン -->
	<div class="resize-bar bottom">
		<button
			class="resize-btn remove"
			onclick={() => {
				const rows = grid.length;
				handleDeleteRow(rows - 1);
			}}
			disabled={grid.length <= 1}
			aria-label="下端の行を削除"
		>
			−
		</button>
		<button
			class="resize-btn add"
			onclick={handleAddRowBottom}
			disabled={grid.length >= GRID_MAX_ROWS}
			aria-label="下に行を追加"
		>
			+
		</button>
	</div>

	{#if contextMenu}
		{@const cm = contextMenu}
		<div
			class="context-menu"
			style="left: {cm.x}px; top: {cm.y}px"
			role="menu"
			aria-label="コンテキストメニュー"
		>
			<button
				class="context-menu-item delete"
				role="menuitem"
				onclick={() => deleteCell(cm.row, cm.col)}
			>
				削除
			</button>
			<button
				class="context-menu-item select"
				role="menuitem"
				onclick={() => useAsSelected(cm.row, cm.col)}
			>
				選択
			</button>
		</div>
	{/if}
</div>

<!-- SCR-03: スマホ向けキーボード入力用非表示フィールド -->
<input
	id="keyboard-input"
	type="text"
	style="position: absolute; left: -9999px;"
	aria-hidden="true"
/>

<button class="keyboard-btn" onclick={focusKeyboardInput} aria-label="キーボードモード">
	⌨
</button>

<style>
	.grid-wrapper {
		position: relative;
		overflow: visible;
		max-width: 100%;
		outline: none;
	}

	/* グリッド外面（上下のresize-barと中央エリアを配置） */
	.grid-outer {
		display: flex;
		flex-direction: column;
	}

	.grid-center {
		display: flex;
		align-self: center;
	}

	/* 上下のresize-bar */
	.resize-bar {
		display: flex;
		justify-content: center;
		gap: 4px;
	}

	.resize-bar.top {
		margin-bottom: 4px;
	}

	.resize-bar.bottom {
		margin-top: 4px;
	}

	/* 左右のresize-bar */
	.resize-bar.left,
	.resize-bar.right {
		flex-direction: column;
		justify-content: center;
		gap: 4px;
	}

	.resize-bar.left {
		margin-right: 4px;
	}

	.resize-bar.right {
		margin-left: 4px;
	}

	/* リサイズボタン共通 */
	.resize-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		font-size: 20px;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.resize-btn.add {
		background: #ffab91;
		color: #bf360c;
	}

	.resize-btn.add:hover:not(:disabled) {
		background: #ff8a65;
	}

	.resize-btn.remove {
		background: #ffcdd2;
		color: #c62828;
	}

	.resize-btn.remove:hover:not(:disabled) {
		background: #ef9a9a;
	}

	.resize-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.grid-scroll-container {
		overflow: auto;
		max-width: 100%;
	}

	.grid {
		border-collapse: collapse;
	}

	.cell {
		box-sizing: border-box;     
		width: var(--cell-size, 48px);
		height: var(--cell-size, 48px) ;
		min-width: var(--cell-size, 48px);
		min-height: var(--cell-size, 48px);
		padding: 0;   
		vertical-align: middle;
		text-align: center;
		cursor: pointer;
		background: #fafafa;
		border: 1px solid #e0e0e0;
		overflow: hidden;
	}

	.cell img {
		display: block;  /* インライン descender 隙間を除去 */
		width: 100%;
		height: 100%;
		object-fit: contain;
		margin:0;
		padding:0;
	}

	.cell:hover {
		background: #e0f7fa;
	}

	.context-menu {
		position: fixed;
		background: #00bcd4;
		border: none;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		min-width: 100px;
		padding: 4px;
	}

	.context-menu-item {
		display: block;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		text-align: center;
		cursor: pointer;
		font-size: 14px;
		border-radius: 2px;
		margin-bottom: 2px;
	}

	.context-menu-item:last-child {
		margin-bottom: 0;
	}

	.context-menu-item:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	.context-menu-item.delete {
		background: rgba(0, 0, 0, 0.15);
	}

	.context-menu-item.delete:hover {
		background: rgba(0, 0, 0, 0.3);
	}

	.context-menu-item.select {
		background: rgba(255, 255, 255, 0.3);
	}

	.context-menu-item.select:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.keyboard-btn {
		position: fixed;
		bottom: 16px;
		right: 16px;
		width: 48px;
		height: 48px;
		border: 2px solid #ccc;
		border-radius: 50%;
		background: white;
		font-size: 20px;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 999;
	}

	/* スマホ向けにキーボードボタンを表示 */
	@media (max-width: 768px) {
		.keyboard-btn {
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
