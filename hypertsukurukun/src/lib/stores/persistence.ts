import { gridStore } from "./grid";
import { paletteStore } from "./palette";
import { nullEmojiStore } from "./nullEmoji";
import { saveGrid, savePalette, saveNullEmoji } from "$lib/storage";

/** gridStoreの変更を購読してlocalStorageに自動保存する */
gridStore.subscribe((grid) => {
	saveGrid(grid);
});

/** パレットリストの変更を購読してlocalStorageに自動保存する */
paletteStore.subscribe((list) => {
	savePalette(list);
});

/** null絵文字設定の変更を購読してlocalStorageに自動保存する */
nullEmojiStore.subscribe((config) => {
	saveNullEmoji(config);
});
