import { derived, writable } from "svelte/store";
import * as Nostr from "nostr-typedef";
import { APP_30030_ATAG } from "$lib/constants";

/** ユーザーのkind 10030イベント */
export const myKind10030Store = writable<Nostr.Event | null>(null);

/** 自分の10030にデフォルトnull絵文字セットが登録済みか（リアクティブ） */
export const hasDefaultRegisteredStore = derived(
  myKind10030Store,
  ($myKind10030) => {
    if (!$myKind10030) return false;
    return $myKind10030.tags.some(
      (tag): tag is ["a", string, ...string[]] =>
        Array.isArray(tag) && tag[0] === "a" && tag[1] === APP_30030_ATAG,
    );
  },
);
