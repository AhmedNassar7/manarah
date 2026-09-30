import {
  parseTafsirResponse,
  parseWordByWordResponse,
  tafsirUrl,
  wordByWordUrl,
  type QuranWord,
  type TafsirEdition,
  type TafsirEntry,
} from "@manarah/core";

/**
 * Runtime loaders for the Quran.com API content that's too large to bundle
 * (tafsir, word-by-word). In-memory cache for this session, keyed by URL —
 * reopening a verse's panel or flipping back to an edition already read
 * doesn't refetch. Across sessions/offline, the service worker's runtime
 * cache (vite.config.ts) serves anything previously read.
 */
const cache = new Map<string, Promise<unknown>>();

function loadCached<T>(url: string, parse: (json: unknown) => T): Promise<T> {
  let entry = cache.get(url) as Promise<T> | undefined;
  if (!entry) {
    entry = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Quran.com request failed: HTTP ${response.status}`);
        return response.json();
      })
      .then(parse);
    cache.set(url, entry);
    // Don't pin a failure (e.g. offline) in the cache — a retry should really retry.
    entry.catch(() => cache.delete(url));
  }
  return entry;
}

export function loadTafsir(edition: TafsirEdition, surah: number, ayah: number): Promise<TafsirEntry> {
  return loadCached(tafsirUrl(edition, surah, ayah), (json) => parseTafsirResponse(json, surah, ayah));
}

export function loadWords(surah: number, ayah: number): Promise<QuranWord[]> {
  return loadCached(wordByWordUrl(surah, ayah), parseWordByWordResponse);
}
