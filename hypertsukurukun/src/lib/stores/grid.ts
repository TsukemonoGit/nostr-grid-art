import { writable, derived } from "svelte/store";
import type { Grid, Cell } from "$lib/types";
import { GRID_INITIAL_ROWS, GRID_INITIAL_COLS } from "$lib/constants";
import { saveGrid } from "$lib/storage";

/** 空のGridを生成する */
function createGrid(rows: number, cols: number): Grid {
	return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/** グリッド状態管理store */
export const gridStore = writable<Grid>(createGrid(GRID_INITIAL_ROWS, GRID_INITIAL_COLS));

/** セルに値を設定する */
export function setCell(row: number, col: number, cell: Cell): void {
	gridStore.update((grid) => {
		const newGrid = grid.map((r) => [...r]);
		if (newGrid[row]) {
			newGrid[row][col] = cell;
		}
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 下端に行を1行追加する */
export function addRowBottom(): void {
	gridStore.update((grid) => {
		const newRow = Array(grid[0]?.length ?? GRID_INITIAL_COLS).fill(null) as Cell[];
		const newGrid = [...grid, newRow];
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 上端に行を1行挿入する */
export function addRowTop(): void {
	gridStore.update((grid) => {
		const newRow = Array(grid[0]?.length ?? GRID_INITIAL_COLS).fill(null) as Cell[];
		const newGrid = [newRow, ...grid];
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 右端に列を1列追加する */
export function addColRight(): void {
	gridStore.update((grid) => {
		const newGrid = grid.map((row) => [...row, null]);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 左端に列を1列挿入する */
export function addColLeft(): void {
	gridStore.update((grid) => {
		const newGrid = grid.map((row) => [null, ...row]);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 行を削除する（配置チェックはコンポーネント側で行う） */
export function removeRow(row: number): void {
	gridStore.update((grid) => {
		const newGrid = grid.filter((_, i) => i !== row);
		saveGrid(newGrid);
		return newGrid;
	});
}

/** 列を削除する（配置チェックはコンポーネント側で行う） */
export function removeCol(col: number): void {
	gridStore.update((grid) => {
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

/** 行に絵文字が配置されているかチェックする */
export function rowHasEmoji(grid: Grid, row: number): boolean {
	return grid[row] !== undefined && grid[row].some((cell) => cell !== null);
}

/** 列に絵文字が配置されているかチェックする */
export function colHasEmoji(grid: Grid, col: number): boolean {
	return grid.some((row) => row[col] !== null);
}
