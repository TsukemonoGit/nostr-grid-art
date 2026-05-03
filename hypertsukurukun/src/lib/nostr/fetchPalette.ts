import { createRxNostr, createRxBackwardReq } from "rx-nostr";
import type { Event as NostrEvent, Filter } from "nostr-typedef";
import type { PaletteEmoji, PaletteSection } from "$lib/types";
import { BOOTSTRAP_RELAYS } from "$lib/constants";

/** rx-nostrのシングルトンインスタンス */
const rx = createRxNostr({
	connectionStrategy: "lazy-keep",
	eoseTimeout: 10000,
});

/**
 * 指定リレーに対してoneshot（backward）reqでイベントを取得する
 * 最初に1つでもイベントがあれば即座にresolveする
 */
async function fetchOneEvent(
	filter: Filter,
	relays: string[],
): Promise<NostrEvent | null> {
	if (relays.length === 0) return null;

	return new Promise((resolve) => {
		const req = createRxBackwardReq();
		const sub = rx.use(req, { on: { relays } }).subscribe({
			next: (packet) => {
				sub.unsubscribe();
				resolve(packet.event as unknown as NostrEvent);
			},
			error: () => {
				resolve(null);
			},
		});
		req.emit(filter);
		req.over();

		// タイムアウト
		setTimeout(() => {
			sub.unsubscribe();
			resolve(null);
		}, 15000);
	});
}

/**
 * 指定リレーに対してoneshot reqでイベントを複数取得する（EOSE待ち）
 */
async function fetchEvents(
	filter: Filter,
	relays: string[],
): Promise<NostrEvent[]> {
	if (relays.length === 0) return [];

	return new Promise((resolve) => {
		const req = createRxBackwardReq();
		const events: NostrEvent[] = [];
		let settled = false;

		const sub = rx.use(req, { on: { relays } }).subscribe({
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

		// タイムアウト
		setTimeout(() => {
			if (!settled) {
				settled = true;
				sub.unsubscribe();
				resolve(events);
			}
		}, 15000);
	});
}

/**
 * リストから重複を除去する
 */
function uniq(arr: string[]): string[] {
	return [...new Set(arr)];
}

/**
 * ステップ1: kind 10002 から readRelays を収集する
 */
async function collectReadRelays(pubkey: string): Promise<string[]> {
	const relays: string[] = [];

	const event = await fetchOneEvent(
		{ kinds: [10002], authors: [pubkey] },
		BOOTSTRAP_RELAYS,
	);

	if (!event) {
		return relays;
	}

	// 'r' タグからリレーURLを収集する
	for (const tag of event.tags) {
		if (
			Array.isArray(tag) &&
			tag.length >= 2 &&
			tag[0] === "r" &&
			typeof tag[1] === "string"
		) {
			relays.push(tag[1]);
		}
	}

	return uniq(relays);
}

/**
 * ステップ2: kind 10030 を取得する
 */
async function fetchKind10030(
	readRelays: string[],
	pubkey: string,
): Promise<NostrEvent> {
	const events = await fetchEvents(
		{ kinds: [10030], authors: [pubkey] },
		readRelays,
	);

	if (events.length === 0) {
		throw new Error("10030 not found");
	}

	// 最新のものを使う（created_atが大きい方）
	return events.reduce((a, b) =>
		(b as unknown as { created_at: string | number }).created_at >
		(a as unknown as { created_at: string | number }).created_at
			? b
			: a,
	);
}

/**
 * ステップ3: kind 30030 を取得する
 */
async function fetchKind30030(
	kind10030Event: NostrEvent,
	readRelays: string[],
): Promise<
	Array<{ identifier: string; event: NostrEvent; relayHints: string[] }>
> {
	const results: Array<{
		identifier: string;
		event: NostrEvent;
		relayHints: string[];
	}> = [];

	// 'a' タグを列挙する（形式: ["a", "kind:pubkey:identifier", relay_hint, ...]）
	const aTags = kind10030Event.tags.filter(
		(
			tag,
		): tag is [string, string, ...string[]] =>
			Array.isArray(tag) &&
			tag.length >= 2 &&
			tag[0] === "a" &&
			typeof tag[1] === "string",
	) as [string, string, ...string[]][];

	for (const aTag of aTags) {
		const kindPubkeyIdentifier = aTag[1];
		// identifier は 3番目の要素（kind:pubkey:identifier の identifier部分）
		const parts = kindPubkeyIdentifier.split(":");
		const identifier = parts.slice(2).join(":");
		const relayHints = aTag.slice(2).filter(
			(r): r is string => typeof r === "string" && r.startsWith("wss://"),
		) as string[];

		// メイン: readRelays + relay hints から取得
		const targetRelays = uniq([...readRelays, ...relayHints]);

		const events = await fetchEvents(
			{ kinds: [30030], "#d": [identifier] },
			targetRelays,
		);

		if (events.length > 0) {
			results.push({
				identifier,
				event: events[0],
				relayHints,
			});
		}
	}

	return results;
}

/**
 * ステップ4（セクション版）: 絵文字をセクションごとに収集・衝突解消する
 * 各30030(identifier)ごとと、ノラ絵文字のセクションに分ける
 */
function collectAndResolveAsSections(
	kind30030Results: Array<{ identifier: string; event: NostrEvent; relayHints: string[] }>,
	kind10030Event: NostrEvent,
): PaletteSection[] {
	/** shortcodeを許可された文字のみでクリーニングする（NIP-30準拠） */
	function cleanShortcode(s: string): string {
		return s.replace(/[^a-zA-Z0-9_-]/g, "_");
	}

	/** 'emoji' タグをイベントから抽出し、衝突解消を適用する */
	function resolveEmojisFromEvent(
		event: NostrEvent,
		refPrefix: string,
		pubkey: string,
	): PaletteEmoji[] {
		const shortcodeMap = new Map<string, PaletteEmoji[]>();

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

				if (!shortcodeMap.has(shortcode)) {
					shortcodeMap.set(shortcode, []);
				}
				shortcodeMap.get(shortcode)!.push(entry);
			}
		}

		// 衝突解消: pubkeyでソートして先勝ち、後続にはsuffix付与
		const result: PaletteEmoji[] = [];
		const usedShortcodes = new Set<string>();

		for (const [, entries] of shortcodeMap) {
			entries.sort((a, b) => {
				const aPubkey = a.ref?.split(":")[1] ?? "";
				const bPubkey = b.ref?.split(":")[1] ?? "";
				return aPubkey.localeCompare(bPubkey);
			});

			const winner = entries[0];
			if (!usedShortcodes.has(winner.shortcode)) {
				usedShortcodes.add(winner.shortcode);
				result.push(winner);
			} else {
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

	// 各30030(identifier)ごとにセクションを作成
	const sections: PaletteSection[] = kind30030Results.map(({ identifier, event }) => {
		const emojis = resolveEmojisFromEvent(event, "30030:", event.pubkey);
		return {
			label: identifier ? `${identifier}の30030絵文字セット` : " unnamed の30030絵文字セット",
			emojis,
		};
	});

	// ノラ絵文字（10030に直接のemojiタグ）を収集
	const norapaintEmojis: PaletteEmoji[] = [];
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
			norapaintEmojis.push({
				shortcode,
				url,
				originalShortcode: rawShortcode,
			});
		}
	}

	// ノラ絵文字セクションを追加（空でない場合のみ）
	if (norapaintEmojis.length > 0) {
		sections.push({
			label: "10030に直入れしている絵文字",
			emojis: norapaintEmojis,
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
export async function fetchPaletteEmojis(pubkey: string): Promise<PaletteEmoji[]> {
	// ステップ1: readRelaysを収集
	const readRelays = await collectReadRelays(pubkey);
	if (readRelays.length === 0) {
		throw new Error("10002 not found in bootstrap relays");
	}

	// ステップ2: kind 10030 を取得
	const kind10030 = await fetchKind10030(readRelays, pubkey);

	// ステップ3: kind 30030 を取得
	const kind30030Results = await fetchKind30030(kind10030, readRelays);

	// ステップ4: 絵文字を収集・衝突解消
	return collectAndResolve(kind30030Results, kind10030);
}

/**
 * pubkeyを使ってセクション付きパレット絵文字を取得する
 * セクション: 各30030(identifier)ごと + ノラ絵文字まとめ
 * @param pubkey ユーザーの公開鍵
 * @returns PaletteSection[]
 */
export async function fetchPaletteSections(pubkey: string): Promise<PaletteSection[]> {
	// ステップ1: readRelaysを収集
	const readRelays = await collectReadRelays(pubkey);
	if (readRelays.length === 0) {
		throw new Error("10002 not found in bootstrap relays");
	}

	// ステップ2: kind 10030 を取得
	const kind10030 = await fetchKind10030(readRelays, pubkey);

	// ステップ3: kind 30030 を取得
	const kind30030Results = await fetchKind30030(kind10030, readRelays);

	// ステップ4: セクション付きで絵文字を収集・衝突解消
	return collectAndResolveAsSections(kind30030Results, kind10030);
}
