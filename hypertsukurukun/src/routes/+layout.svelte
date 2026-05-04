<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import favicon from "$lib/assets/favicon.svg";
  import {
    gridStore,
    paletteStore,
    nullEmojiStore,
    paletteSectionsStore,
  } from "$lib/stores";
  import { pubkeyStore } from "$lib/stores";
  import {
    loadGrid,
    loadPalette as loadPaletteStorage,
    loadPaletteSectionsStorage,
    loadNullEmoji,
  } from "$lib/storage";
  import {
    fetchPaletteSections,
    startWatchingMyKind10030,
  } from "$lib/nostr/fetchPalette";
  import {
    loadPaletteSections,
    sectionsFromFlatList,
  } from "$lib/stores/palette";
  import { isMobile } from "$lib/stores/isMobile";
  import { myKind10030Store } from "$lib/stores/myKind10030";

  let { children } = $props();

  onMount(() => {
    // nostr-loginを初期化（asyncなので直接returnしない）
    (async () => {
      try {
        const { init } = await import("@konemono/nostr-login");
        await init({
          methods: ["connect", "extension", "readOnly", "local", "nsec"],
          startScreen: "welcome",
        });
        console.log("nostr-login initialized");
      } catch (e) {
        console.error("Failed to initialize nostr-login:", e);
      }
    })();

    // localStorageからデータを復元する
    const savedGrid = loadGrid();
    if (savedGrid) {
      gridStore.set(savedGrid);
    }

    const savedPalette = loadPaletteStorage();
    const savedSections = loadPaletteSectionsStorage();
    if (savedSections && savedSections.length > 0) {
      loadPaletteSections(savedSections);
    } else if (savedPalette) {
      paletteStore.set(savedPalette);
      const sections = sectionsFromFlatList(savedPalette);
      if (sections.length > 0) {
        paletteSectionsStore.set(sections);
      }
    }

    const savedNullEmoji = loadNullEmoji();
    if (savedNullEmoji) {
      nullEmojiStore.set(savedNullEmoji);
    }

    // nlAuthイベントを監視
    const handleAuthEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("nlAuth event:", detail);

      if (detail?.type === "login" || detail?.type === "signup") {
        // window.nostrからpubkeyを取得
        if (window.nostr) {
          window.nostr
            .getPublicKey()
            .then((pubkey: string) => {
              console.log("Logged in with pubkey:", pubkey);
              pubkeyStore.set(pubkey);
              // パレット絵文字をセクション付きで取得
              fetchPaletteSections(pubkey)
                .then((sections) => {
                  console.log(
                    "Palette sections loaded:",
                    sections.length,
                    "sections",
                  );
                  loadPaletteSections(sections);
                })
                .catch((err) => {
                  console.error("Failed to fetch palette:", err);
                });
            })
            .catch((err: unknown) => {
              console.error("Failed to get pubkey:", err);
            });
        }
      } else if (detail?.type === "logout") {
        pubkeyStore.set(null);
        loadPaletteSections([]);
      }
    };

    document.addEventListener("nlAuth", handleAuthEvent);

    // イベントリスナーをクリーンアップ
    return () => {
      document.removeEventListener("nlAuth", handleAuthEvent);
    };
  });

  // pubkeyが変わったらkind10030の購読を切り替え
  $effect(() => {
    const pk = $pubkeyStore;
    if (pk) {
      startWatchingMyKind10030(pk);
    } else {
      myKind10030Store.set(null);
    }
  });

  $effect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    isMobile.set(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      isMobile.set(e.matches);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
