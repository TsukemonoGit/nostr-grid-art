import { writable, derived } from "svelte/store";
import type { Grid, Cell } from "$lib/types";
import { GRID_INITIAL_ROWS, GRID_INITIAL_COLS } from "$lib/constants";
import { saveGrid } from "$lib/storage";

/** 全消しボタンの確認ダイアログ表示有無（デフォルトON） */
let showClearConfirm = true;

/** 元に戻す最大履歴数 */
const MAX_UNDO = 10;

/** 操作履歴（undoスタック） */
let undoStack: Grid[] = [];

/** やり直しスタック（undo後に空になる） */
let redoStack: Grid[] = [];

/** 空のGridを生成する */
function createGrid(rows: number, cols: number): Grid {
	return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/** グリッド状態管理store */
export const gridStore = writable<Grid>(createGrid(GRID_INITIAL_ROWS, GRID_INITIAL_COLS));

/** undo可能かどうか */
export const canUndo = derived(gridStore, () => undoStack.length > 0);

/** redo可能かどうか */
export const canRedo = derived(gridStore, () => redoStack.length > 0);

/** セルに値を設定する */
export function setCell(row: number, col: number, cell: Cell): void {
	gridStore.update((grid) => {
		const newGrid = grid.map((r) => [...r]);
		if (newGrid[row]) {
			// 変更前のグリッドをundoスタックに保存
			undoStack.push(grid.map((r) => [...r]));
			if (undoStack.length > MAX_UNDO) {
				undoStack = undoStack.slice(-MAX_UNDO);
			}
			// redoスタックをクリア（新しい操作でredo履歴は破棄）
			redoStack = [];
			newGrid[row][col] = cell;
		}
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 変更前のグリッドをundoスタックに追加する */
function pushUndo(grid: Grid): void {
	undoStack.push(grid.map((r) => [...r]));
	if (undoStack.length > MAX_UNDO) {
		undoStack = undoStack.slice(-MAX_UNDO);
	}
	redoStack = [];
}

/** 下端に行を1行追加する */
export function addRowBottom(): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newRow = Array(grid[0]?.length ?? GRID_INITIAL_COLS).fill(null) as Cell[];
		const newGrid = [...grid, newRow];
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 上端に行を1行挿入する */
export function addRowTop(): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newRow = Array(grid[0]?.length ?? GRID_INITIAL_COLS).fill(null) as Cell[];
		const newGrid = [newRow, ...grid];
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 右端に列を1列追加する */
export function addColRight(): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newGrid = grid.map((row) => [...row, null]);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 左端に列を1列挿入する */
export function addColLeft(): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newGrid = grid.map((row) => [null, ...row]);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 行を削除する（配置チェックはコンポーネント側で行う） */
export function removeRow(row: number): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newGrid = grid.filter((_, i) => i !== row);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 列を削除する（配置チェックはコンポーネント側で行う） */
export function removeCol(col: number): void {
	gridStore.update((grid) => {
		pushUndo(grid);
		const newGrid = grid.map((row) => row.filter((_, i) => i !== col));
		saveGrid(newGrid);
		return newGrid;
	});
}

/** グリッドをロードする */
export function loadGrid(grid: Grid): void {
	gridStore.set(grid);
	saveGrid(grid);
}

/** グリッドを全消しする */
export function clearAll(): void {
	gridStore.update((grid) => {
		// 空でない場合のみundoスタックに保存
		if (grid.some((row) => row.some((cell) => cell !== null))) {
			pushUndo(grid);
		}
		const emptyGrid = createGrid(grid.length, grid[0]?.length ?? GRID_INITIAL_COLS);
		saveGrid(emptyGrid);
		return emptyGrid;
	});
}

/** 元に戻す */
export function undo(): void {
	if (undoStack.length === 0) return;
	gridStore.update((grid) => {
		// 現在のグリッドをredoスタックに保存
		redoStack.push(grid.map((r) => [...r]));
		// 直前の状態に戻す
		const prevGrid = undoStack.pop()!;
		saveGrid(prevGrid);
		return prevGrid;
	});
}

/** やり直す */
export function redo(): void {
	if (redoStack.length === 0) return;
	gridStore.update((grid) => {
		// 現在のグリッドをundoスタックに保存
		undoStack.push(grid.map((r) => [...r]));
		// 次の状態に進める
		const nextGrid = redoStack.pop()!;
		saveGrid(nextGrid);
		return nextGrid;
	});
}

/** 全消し確認の表示有無を取得 */
export function getShowClearConfirm(): boolean {
	return showClearConfirm;
}

/** 全消し確認の表示有無を設定 */
export function setShowClearConfirm(value: boolean): void {
	showClearConfirm = value;
}

/** 行に絵文字が配置されているかチェックする */
export function rowHasEmoji(grid: Grid, row: number): boolean {
	return grid[row] !== undefined && grid[row].some((cell) => cell !== null);
}

/** 列に絵文字が配置されているかチェックする */
export function colHasEmoji(grid: Grid, col: number): boolean {
	return grid.some((row) => row[col] !== null);
}
