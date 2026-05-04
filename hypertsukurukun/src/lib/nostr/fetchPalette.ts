import {
  createRxNostr,
  createRxBackwardReq,
  latest,
  uniq,
  completeOnTimeout,
  type AcceptableDefaultRelaysConfig,
  createRxForwardReq,
} from "rx-nostr";
import type {
  Event as NostrEvent,
  Filter,
  EventParameters,
} from "nostr-typedef";

import type { PaletteEmoji, PaletteSection } from "$lib/types";
import {
  APP_30030_ATAG,
  APP_30030_RELAY,
  BOOTSTRAP_RELAYS,
} from "$lib/constants";
import { verifier } from "@rx-nostr/crypto";
import { Subject } from "rxjs";
import { myKind10030Store } from "$lib/stores/myKind10030";

/** rx-nostrのシングルトンインスタンス */
const rx = createRxNostr({
  connectionStrategy: "lazy-keep",
  verifier,
});

export async function publishEvent(ev: EventParameters): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const results: boolean[] = [];
    let completed = false;

    const sub = rx.send(ev).subscribe({
      next: (packet) => {
        console.log(
          `Sending to ${packet.from} ${packet.ok ? "succeeded" : "failed"}.`,
        );
        if (packet.ok && !resolved) {
          resolved = true;
          sub.unsubscribe();
          resolve(true);
          return;
        }
        results.push(packet.ok);
        if (completed && !resolved) {
          resolved = true;
          resolve(false);
        }
      },
      complete: () => {
        completed = true;
        if (!resolved) {
          resolved = true;
          resolve(results.some(Boolean));
        }
      },
      error: () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      },
    });
  });
}

/** 初期化: bootstrapリレーをread-onlyで設定 */
rx.setDefaultRelays(
  BOOTSTRAP_RELAYS.map((url) => ({ url, read: true, write: false })),
);

export function getDefaultRelays(): AcceptableDefaultRelaysConfig {
  return rx.getDefaultRelays();
}

/**
 * 指定リレーに対してoneshot（backward）reqでイベントを取得する
 * 最初に1つでもイベントがあれば即座にresolveする
 */
async function fetchOneEvent(
  filter: Filter,
  tempRelays?: string[],
): Promise<NostrEvent | null> {
  return new Promise((resolve) => {
    const req = createRxBackwardReq();
    const flushes$ = new Subject<void>();

    // 一時リレーを指定する場合: tempRelays、そうでない場合はdefault relaysを使用
    const sub =
      tempRelays && tempRelays.length > 0
        ? rx
            .use(req, { on: { relays: tempRelays } })
            .pipe(uniq(flushes$), latest(), completeOnTimeout(15000))
            .subscribe({
              next: (packet) => {
                sub.unsubscribe();
                resolve(packet.event as unknown as NostrEvent);
              },
              complete: () => {
                resolve(null);
              },
              error: () => {
                resolve(null);
              },
            })
        : rx
            .use(req)
            .pipe(uniq(flushes$), latest(), completeOnTimeout(15000))
            .subscribe({
              next: (packet) => {
                sub.unsubscribe();
                resolve(packet.event as unknown as NostrEvent);
              },
              complete: () => {
                resolve(null);
              },
              error: () => {
                resolve(null);
              },
            });

    req.emit(filter);
    req.over();
  });
}

/**
 * 指定リレーに対してoneshot reqでイベントを複数取得する（EOSE待ち）
 * tempRelaysを指定しない場合はdefault relaysを使用
 */
async function fetchEvents(
  filter: Filter,
  tempRelays?: string[],
): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const req = createRxBackwardReq();
    const events: NostrEvent[] = [];
    let settled = false;

    const flushes$ = new Subject<void>();

    const sub =
      tempRelays && tempRelays.length > 0
        ? rx
            .use(req, { on: { relays: tempRelays } })
            .pipe(uniq(flushes$), completeOnTimeout(15000))
            .subscribe({
              next: (packet) => {
                events.push(packet.event as unknown as NostrEvent);
              },
              complete: () => {
                if (!settled) {
                  settled = true;
                  resolve(events);
                }
              },
              error: () => {
                if (!settled) {
                  settled = true;
                  resolve(events);
                }
              },
            })
        : rx
            .use(req)
            .pipe(uniq(flushes$), completeOnTimeout(15000))
            .subscribe({
              next: (packet) => {
                events.push(packet.event as unknown as NostrEvent);
              },
              complete: () => {
                if (!settled) {
                  settled = true;
                  resolve(events);
                }
              },
              error: () => {
                if (!settled) {
                  settled = true;
                  resolve(events);
                }
              },
            });

    req.emit(filter);
    req.over();
  });
}

/**
 * ステップ1: kind 10002 から Relays を収集する
 * bootstrap relaysを使って10002イベントを取得
 */
async function collectRelays(pubkey: string): Promise<boolean> {
  // bootstrap relays（一時リレー）を使って10002イベントを取得
  const event = await fetchOneEvent(
    { kinds: [10002], authors: [pubkey] },
    BOOTSTRAP_RELAYS,
  );

  if (!event || event.tags.length <= 0) {
    console.log("collectRelays: no 10002 event found");
    return false;
  }
  console.log("collectRelays: found 10002 event, pubkey:", event.pubkey);

  rx.setDefaultRelays(event.tags);
  return true;
}

/**
 * ステップ2: kind 10030 を取得する
 * default relays（10002）を使用
 */
export async function fetchKind10030(pubkey: string): Promise<NostrEvent> {
  console.log("fetchKind10030: fetching for pubkey:", pubkey);
  console.log("fetchKind10030: current default relays:", getDefaultRelays());
  const events = await fetchEvents({ kinds: [10030], authors: [pubkey] });
  console.log("fetchKind10030: fetched", events.length, "events");

  if (events.length === 0) {
    throw new Error("10030 not found");
  }

  // 最新のものを使う（created_atが大きい方）
  return events.reduce((a, b) => (b.created_at > a.created_at ? b : a));
}

/**
 * ステップ3: kind 30030 を取得する
 * 'a' タグのrelay hintsがあれば一時リレーとして使用
 */
async function fetchKind30030(
  kind10030Event: NostrEvent,
): Promise<
  Array<{ identifier: string; event: NostrEvent; relayHints: string[] }>
> {
  console.log("fetchKind30030: starting");
  const results: Array<{
    identifier: string;
    event: NostrEvent;
    relayHints: string[];
  }> = [];

  // 'a' タグを列挙する（形式: ["a", "kind:pubkey:identifier", relay_hint, ...]）
  const aTags = kind10030Event.tags.filter(
    (tag): tag is [string, string, ...string[]] =>
      Array.isArray(tag) &&
      tag.length >= 2 &&
      tag[0] === "a" &&
      typeof tag[1] === "string",
  ) as [string, string, ...string[]][];

  console.log("fetchKind30030: found", aTags.length, "a-tags");

  // 並列でフェッチしてパフォーマンスを向上
  const fetchPromises = aTags.map(async (aTag) => {
    const kindPubkeyIdentifier = aTag[1];
    // identifier は 3番目の要素（kind:pubkey:identifier の identifier部分）
    const parts = kindPubkeyIdentifier.split(":");
    const identifier = parts.slice(2).join(":");
    const relayHints = aTag
      .slice(2)
      .filter(
        (r): r is string => typeof r === "string" && r.startsWith("wss://"),
      ) as string[];

    console.log(
      `fetchKind30030: fetching identifier="${identifier}", relayHints:`,
      relayHints,
    );
    // relay hintsがあれば一時リレーとして使用、なければdefault relaysを使用
    const events = await fetchEvents(
      { kinds: [30030], "#d": [identifier] },
      relayHints.length > 0 ? relayHints : undefined,
    );
    console.log(
      `fetchKind30030: fetched ${events.length} events for identifier="${identifier}"`,
    );

    if (events.length > 0) {
      return { identifier, event: events[0], relayHints };
    }
    return null;
  });

  // 全Promiseを並列実行
  const resolved = await Promise.all(fetchPromises);
  // nullをフィルタリング
  for (const item of resolved) {
    if (item !== null) {
      results.push(item);
    }
  }

  console.log("fetchKind30030: returning", results.length, "results");
  return results;
}

/**
 * ステップ4（セクション版）: 絵文字をセクションごとに収集・衝突解消する
 * 各30030(identifier)ごとと、ノラ絵文字のセクションに分ける
 */
function collectAndResolveAsSections(
  kind30030Results: Array<{
    identifier: string;
    event: NostrEvent;
    relayHints: string[];
  }>,
  kind10030Event: NostrEvent,
): PaletteSection[] {
  /** shortcodeを許可された文字のみでクリーニングする（NIP-30準拠） */
  function cleanShortcode(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  /** 'emoji' タグをイベントから抽出する（衝突解消は行わない） */
  function extractEmojisFromEvent(
    event: NostrEvent,
    refPrefix: string,
    pubkey: string,
  ): PaletteEmoji[] {
    const emojis: PaletteEmoji[] = [];

    for (const tag of event.tags) {
      if (
        Array.isArray(tag) &&
        tag.length >= 3 &&
        tag[0] === "emoji" &&
        typeof tag[1] === "string" &&
        typeof tag[2] === "string"
      ) {
        const [, rawShortcode, url] = tag;
        const shortcode = cleanShortcode(rawShortcode);

        const entry: PaletteEmoji = {
          shortcode,
          url,
          originalShortcode: rawShortcode,
        };

        if (refPrefix) {
          entry.ref = `${refPrefix}${pubkey}:`;
        }

        emojis.push(entry);
      }
    }

    return emojis;
  }

  // 各30030(identifier)ごとにセクションを作成（セクションIDを付与）
  type EmojiWithSection = PaletteEmoji & { sectionIndex: number };
  const allEmojisWithSection: EmojiWithSection[] = [];
  const sections: PaletteSection[] = kind30030Results.map(
    ({ identifier, event }, index) => {
      const emojis = extractEmojisFromEvent(event, "30030:", event.pubkey);
      for (const emoji of emojis) {
        allEmojisWithSection.push({ ...emoji, sectionIndex: index });
      }
      return {
        label: identifier ?? "unnamed",
        emojis,
      };
    },
  );

  // ノラ絵文字（10030に直接のemojiタグ）を収集（セクションIDを後で付与）
  const norapaintEmojisRaw: PaletteEmoji[] = [];
  for (const tag of kind10030Event.tags) {
    if (
      Array.isArray(tag) &&
      tag.length >= 3 &&
      tag[0] === "emoji" &&
      typeof tag[1] === "string" &&
      typeof tag[2] === "string"
    ) {
      const [, rawShortcode, url] = tag;
      const shortcode = cleanShortcode(rawShortcode);
      norapaintEmojisRaw.push({
        shortcode,
        url,
        originalShortcode: rawShortcode,
      });
    }
  }

  // ノラ絵文字のセクションIDを付与（全30030セクションの後ろ）
  const norapaintSectionIndex = kind30030Results.length;
  for (const emoji of norapaintEmojisRaw) {
    allEmojisWithSection.push({ ...emoji, sectionIndex: norapaintSectionIndex });
  }

  // 全セクション間で衝突解消: pubkeyでソート、先勝ち
  const shortcodeMap = new Map<string, EmojiWithSection[]>();
  for (const emoji of allEmojisWithSection) {
    if (!shortcodeMap.has(emoji.shortcode)) {
      shortcodeMap.set(emoji.shortcode, []);
    }
    shortcodeMap.get(emoji.shortcode)!.push(emoji);
  }

  const usedShortcodes = new Set<string>();
  const resolvedAll: EmojiWithSection[] = [];

  for (const [shortcode, emojis] of shortcodeMap) {
    // pubkeyでソート（決定性を持たせる）
    emojis.sort((a, b) => {
      const aPubkey = a.ref?.split(":")[1] ?? "";
      const bPubkey = b.ref?.split(":")[1] ?? "";
      return aPubkey.localeCompare(bPubkey);
    });

    // 先頭から順に処理（各絵文字に自分のshortcodeを割り当てる）
    for (const emoji of emojis) {
      if (!usedShortcodes.has(emoji.shortcode)) {
        usedShortcodes.add(emoji.shortcode);
        resolvedAll.push(emoji);
      } else {
        let suffix = 2;
        let newShortcode = `${emoji.shortcode}_${suffix}`;
        while (usedShortcodes.has(newShortcode)) {
          suffix++;
          newShortcode = `${emoji.shortcode}_${suffix}`;
        }
        resolvedAll.push({
          ...emoji,
          shortcode: newShortcode,
          sectionIndex: emoji.sectionIndex,
        });
        usedShortcodes.add(newShortcode);
      }
    }
  }

  // 結果をセクションごとに再分配
  for (const section of sections) {
    section.emojis = resolvedAll
      .filter((e) => e.sectionIndex === sections.indexOf(section))
      .map(({ sectionIndex: _, ...emoji }) => emoji);
  }

  // ノラ絵文字セクションを追加（空でない場合のみ）
  if (norapaintEmojisRaw.length > 0) {
    sections.push({
      label: "ノラ絵文字",
      emojis: resolvedAll
        .filter((e) => e.sectionIndex === norapaintSectionIndex)
        .map(({ sectionIndex: _, ...emoji }) => emoji),
    });
  }

  return sections;
}

/**
 * ステップ4: 絵文字を収集・衝突解消する
 */
function collectAndResolve(
  kind30030Results: Array<{ identifier: string; event: NostrEvent }>,
  kind10030Event: NostrEvent,
): PaletteEmoji[] {
  // 衝突解消用: shortcode -> PaletteEmoji[]
  const shortcodeMap = new Map<string, PaletteEmoji[]>();

  /** shortcodeを許可された文字のみでクリーニングする（NIP-30準拠） */
  function cleanShortcode(s: string): string {
    return s.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  /** 'emoji' タグをイベントから抽出してshortcodeMapに追加する */
  function addEmojiFromEvent(
    event: NostrEvent,
    ref: string | undefined,
    pubkey: string,
    identifier: string,
  ) {
    for (const tag of event.tags) {
      if (
        Array.isArray(tag) &&
        tag.length >= 3 &&
        tag[0] === "emoji" &&
        typeof tag[1] === "string" &&
        typeof tag[2] === "string"
      ) {
        const [, rawShortcode, url] = tag;
        const shortcode = cleanShortcode(rawShortcode);

        const entry: PaletteEmoji = {
          shortcode,
          url,
          originalShortcode: rawShortcode,
        };

        if (ref) {
          entry.ref = ref;
        }

        if (!shortcodeMap.has(shortcode)) {
          shortcodeMap.set(shortcode, []);
        }
        shortcodeMap.get(shortcode)!.push(entry);
      }
    }
  }

  // kind 30030 から絵文字を収集
  for (const { event } of kind30030Results) {
    const pubkey = event.pubkey;
    addEmojiFromEvent(event, `30030:${pubkey}:`, pubkey, "");
  }

  // kind 10030 のノラ絵文字（直接の 'emoji' タグ）も収集
  for (const tag of kind10030Event.tags) {
    if (
      Array.isArray(tag) &&
      tag.length >= 3 &&
      tag[0] === "emoji" &&
      typeof tag[1] === "string" &&
      typeof tag[2] === "string"
    ) {
      const [, rawShortcode, url] = tag;
      const shortcode = cleanShortcode(rawShortcode);

      const entry: PaletteEmoji = {
        shortcode,
        url,
        originalShortcode: rawShortcode,
      };

      if (!shortcodeMap.has(shortcode)) {
        shortcodeMap.set(shortcode, []);
      }
      shortcodeMap.get(shortcode)!.push(entry);
    }
  }

  // 衝突解消: pubkey+dtagでソートして先勝ち
  // 実装上は、配列の先頭が勝ち。同名の場合は最初のエントリを使う
  const result: PaletteEmoji[] = [];
  const usedShortcodes = new Set<string>();

  for (const [shortcode, entries] of shortcodeMap) {
    // pubkeyでソート（決定性を持たせる）
    entries.sort((a, b) => {
      const aPubkey = a.ref?.split(":")[1] ?? "";
      const bPubkey = b.ref?.split(":")[1] ?? "";
      return aPubkey.localeCompare(bPubkey);
    });

    // 先勝ち
    const winner = entries[0];
    if (!usedShortcodes.has(winner.shortcode)) {
      usedShortcodes.add(winner.shortcode);
      result.push(winner);
    } else {
      // すでに使われているshortcodeの場合は suffix を付与
      let suffix = 2;
      let newShortcode = `${winner.shortcode}_${suffix}`;
      while (usedShortcodes.has(newShortcode)) {
        suffix++;
        newShortcode = `${winner.shortcode}_${suffix}`;
      }
      usedShortcodes.add(newShortcode);
      result.push({
        ...winner,
        shortcode: newShortcode,
      });
    }
  }

  return result;
}

/**
 * pubkeyを使ってパレット絵文字を取得する
 * @param pubkey ユーザーの公開鍵
 * @returns PaletteEmoji[]
 */
export async function fetchPaletteEmojis(
  pubkey: string,
): Promise<PaletteEmoji[]> {
  console.log("fetchPaletteEmojis: START pubkey:", pubkey);
  try {
    // ステップ1: readRelaysを収集（内部でsetDefaultRelaysに設定）
    const res = await collectRelays(pubkey);
    if (!res) {
      console.log("failed to get user kind:10002 relays");
      //なかったら10002検索用りれーでそのまま10030を探す
    }
    // ステップ2: kind 10030 を取得（default relaysを使用）
    const kind10030 = await fetchKind10030(pubkey);

    // ステップ3: kind 30030 を取得（relay hintsがあれば一時リレーとして使用）
    const kind30030Results = await fetchKind30030(kind10030);

    // ステップ4: 絵文字を収集・衝突解消
    const result = collectAndResolve(kind30030Results, kind10030);
    console.log("fetchPaletteEmojis: SUCCESS,", result.length, "emojis");
    return result;
  } catch (err) {
    console.error("fetchPaletteEmojis: ERROR", err);
    throw err;
  }
}

/**
 * 自分のkind 10030にデフォルトnull絵文字セットの'a'タグを追加してpublishする
 * kind 10030がない場合は新規作成し、'a'タグが既に追加済みかチェックして重複防止
 * @param pubkey ユーザーの公開鍵
 * @returns 成功したかどうか
 */
export async function addDefaultEmojiToMyKind10030(
  pubkey: string,
): Promise<boolean> {
  // kind 10030イベントを取得（ない場合はundefined）
  let kind10030: NostrEvent | undefined;
  try {
    kind10030 = await fetchKind10030(pubkey);
  } catch {
    kind10030 = undefined;
  }

  // kind 10030がない場合は新規作成
  if (!kind10030) {
    console.log(
      "addDefaultEmojiToMyKind10030: no kind 10030 found, creating new event",
    );
    const unsignedEvent = {
      kind: 10030 as const,
      tags: [["a", APP_30030_ATAG, APP_30030_RELAY]],
      content: "",
      created_at: Math.floor(Date.now() / 1000),
    };

    console.log(
      "addDefaultEmojiToMyKind10030: signing new event with window.nostr",
    );
    const signedEvent = await (window as any).nostr.signEvent(unsignedEvent);

    console.log("addDefaultEmojiToMyKind10030: publishing new event");
    return await publishEvent(signedEvent as EventParameters);
  }

  // 既存の'a'タグを確認（重複防止）
  const existingAValues = new Set<string>();
  for (const tag of kind10030.tags) {
    if (
      Array.isArray(tag) &&
      tag.length >= 2 &&
      tag[0] === "a" &&
      typeof tag[1] === "string"
    ) {
      existingAValues.add(tag[1]);
    }
  }

  // 既に登録済みかチェック
  if (existingAValues.has(APP_30030_ATAG)) {
    console.log("addDefaultEmojiToMyKind10030: already registered");
    return true;
  }

  // 新しい'a'タグを追加（relay hint付き）
  const newTag: (string | string[])[] = ["a", APP_30030_ATAG, APP_30030_RELAY];
  const updatedTags = [...kind10030.tags, newTag];

  // window.nostr.signEventで署名付きイベントを作成
  const unsignedEvent = {
    kind: 10030 as const,
    tags: updatedTags,
    content: kind10030.content,
    created_at: Math.floor(Date.now() / 1000),
  };

  console.log("addDefaultEmojiToMyKind10030: signing event with window.nostr");
  const signedEvent = await (window as any).nostr.signEvent(unsignedEvent);

  console.log("addDefaultEmojiToMyKind10030: publishing updated event");
  return await publishEvent(signedEvent as EventParameters);
}

/**
 * pubkeyを使ってセクション付きパレット絵文字を取得する
 * セクション: 各30030(identifier)ごと + ノラ絵文字まとめ
 * @param pubkey ユーザーの公開鍵
 * @returns PaletteSection[]
 */
export async function fetchPaletteSections(
  pubkey: string,
): Promise<PaletteSection[]> {
  console.log("fetchPaletteSections: START pubkey:", pubkey);
  try {
    // ステップ1:10002リレーリストを取得（内部でsetDefaultRelaysに設定）
    await collectRelays(pubkey);

    // ステップ2: kind 10030 を取得（default relaysを使用）
    const kind10030 = await fetchKind10030(pubkey);

    // ステップ3: kind 30030 を取得（relay hintsがあれば一時リレーとして使用）
    const kind30030Results = await fetchKind30030(kind10030);

    // ステップ4: セクション付きで絵文字を収集・衝突解消
    const result = collectAndResolveAsSections(kind30030Results, kind10030);
    console.log("fetchPaletteSections: SUCCESS,", result.length, "sections");
    return result;
  } catch (err) {
    console.error("fetchPaletteSections: ERROR", err);
    throw err;
  }
}

/** 自分のkind 10030をForwardReqで購読開始する */
export function startWatchingMyKind10030(currentPubkey: string): void {
  const req = createRxForwardReq();
  const flushes$ = new Subject<void>();

  const sub = rx
    .use(req)
    .pipe(uniq(flushes$), latest())
    .subscribe({
      next: (packet) => {
        const event = packet.event as unknown as NostrEvent;
        console.log("startWatchingMyKind10030: received kind 10030", event.id);
        myKind10030Store.set(event);
      },
      error: (err) => {
        console.error("startWatchingMyKind10030: error", err);
      },
    });

  req.emit({ kinds: [10030], authors: [currentPubkey] });
}
