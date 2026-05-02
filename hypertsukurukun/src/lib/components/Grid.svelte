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

	/** セルの絵文字をパレットにコピーする（CTX-02） */
	function copyToPalette(row: number, col: number): void {
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

<div class="grid-wrapper" onclick={handleBackgroundClick} tabindex="0" onkeydown={handleKeydown} aria-label="絵文字グリッド">
	<!-- 上端＋ボタン（RSZ-04） -->
	<div class="resize-controls top">
		<button
			class="add-btn"
			onclick={handleAddRowTop}
			disabled={grid.length >= GRID_MAX_ROWS}
			aria-label="上に行を追加"
		>
			▲
		</button>
	</div>

	<!-- 左端＋ボタン（RSZ-05） -->
	<div class="resize-controls left">
		<button
			class="add-btn"
			onclick={handleAddColLeft}
			disabled={grid[0]?.length >= GRID_MAX_COLS}
			aria-label="左に列を追加"
		>
			◀
		</button>
	</div>

	<div class="grid-scroll-container" bind:this={scrollContainer}>
		<table class="grid">
			<thead>
				<tr>
					<th class="corner"></th>
					{#each grid[0] as _, colIndex}
						<th class="col-header">
							<button
								class="delete-col-btn"
								onclick={() => handleDeleteCol(colIndex)}
								aria-label={`${colIndex + 1}列目を削除`}
							>
								✕
							</button>
						</th>
					{/each}
					<th class="col-header add-col">
						<button
							class="add-btn"
							onclick={handleAddColRight}
							disabled={grid[0]?.length >= GRID_MAX_COLS}
							aria-label="右に列を追加"
						>
							+
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each grid as row, rowIndex}
					<tr>
						<td class="row-header">
							<button
								class="delete-row-btn"
								onclick={() => handleDeleteRow(rowIndex)}
								aria-label={`${rowIndex + 1}行目を削除`}
							>
								✕
							</button>
						</td>
						{#each row as cell, colIndex}
							<td
								class="cell"
								role="gridcell"
								aria-label={cell ? `絵文字 ${cell[1]}` : "空セル"}
								onclick={(e) => handleCellClick(rowIndex, colIndex, e)}
							>
								{#if cell && cell[0] === "emoji"}
									<img src={cell[2]} alt={cell[1]} loading="lazy" />
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<th class="corner"></th>
					{#each grid[0] ?? [] as _, colIndex}
						<th class="col-footer"></th>
					{/each}
					<th class="col-footer add-row-footer">
						<button
							class="add-btn"
							onclick={handleAddRowBottom}
							disabled={grid.length >= GRID_MAX_ROWS}
							aria-label="下に行を追加"
						>
							+
						</button>
					</th>
				</tr>
			</tfoot>
		</table>
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
				class="context-menu-item"
				role="menuitem"
				onclick={() => deleteCell(cm.row, cm.col)}
			>
				削除
			</button>
			<button
				class="context-menu-item"
				role="menuitem"
				onclick={() => copyToPalette(cm.row, cm.col)}
			>
				パレットにコピー
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

	.resize-controls {
		display: flex;
	}

	.resize-controls.top {
		justify-content: flex-end;
		margin-bottom: 4px;
	}

	.resize-controls.left {
		margin-right: 4px;
	}

	.grid-scroll-container {
		overflow: auto;
		max-width: 100%;
	}

	.grid {
		border-collapse: collapse;
	}

	.corner {
		width: 32px;
		height: 20px;
		border: none;
		background: transparent;
	}

	th, td {
		padding: 0;
		border: 1px solid #e0e0e0;
	}

	th {
		background: #f0f0f0;
	}

	.col-header, .col-footer {
		min-width: var(--cell-size, 48px);
		width: var(--cell-size, 48px);
		text-align: center;
	}

	.row-header {
		min-width: 32px;
		width: 32px;
		text-align: center;
	}

	.add-col, .add-row-footer {
		background: #e8f5e9;
	}

	.cell {
		width: var(--cell-size, 48px);
		height: var(--cell-size, 48px);
		min-width: var(--cell-size, 48px);
		min-height: var(--cell-size, 48px);
		vertical-align: middle;
		text-align: center;
		cursor: pointer;
		background: #fafafa;
	}

	.cell img {
		width: 80%;
		height: 80%;
		object-fit: contain;
	}

	.cell:hover {
		background: #f0f0f0;
	}

	.add-btn {
		width: 24px;
		height: 24px;
		border: 1px solid #81c784;
		border-radius: 4px;
		background: #e8f5e9;
		color: #2e7d32;
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.add-btn:hover:not(:disabled) {
		background: #c8e6c9;
	}

	.add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.delete-row-btn, .delete-col-btn {
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 3px;
		background: #ffcdd2;
		color: #c62828;
		font-size: 12px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-row-btn:hover, .delete-col-btn:hover {
		background: #ef9a9a;
	}

	.context-menu {
		position: fixed;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		min-width: 120px;
	}

	.context-menu-item {
		display: block;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		font-size: 14px;
	}

	.context-menu-item:hover {
		background: #f0f0f0;
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
		display: none;
	}

	/* スマホ向けに表示 */
	@media (max-width: 768px) {
		.keyboard-btn {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.delete-row-btn, .delete-col-btn {
			display: flex;
		}
	}

	/* PCではホバー時のみ削除ボタンを表示 */
	@media (min-width: 769px) {
		.delete-row-btn, .delete-col-btn {
			display: none;
		}

		.row-header:hover .delete-row-btn,
		.col-header:hover .delete-col-btn {
			display: flex;
		}
	}
</style>
