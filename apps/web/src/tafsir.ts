import { parseTafsirResponse, tafsirUrl, type TafsirEdition, type TafsirEntry } from "@manarah/core";

/**
 * In-memory cache for this session, keyed by URL — reopening a verse's tafsir
 * or flipping back to an edition already read doesn't refetch. Across
 * sessions/offline, the service worker's runtime cache (vite.config.ts)
 * serves previously read tafsir.
 */
const cache = new Map<string, Promise<TafsirEntry>>();

export function loadTafsir(edition: TafsirEdition, surah: number, ayah: number): Promise<TafsirEntry> {
  const url = tafsirUrl(edition, surah, ayah);
  let entry = cache.get(url);
  if (!entry) {
    entry = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Tafsir request failed: HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => parseTafsirResponse(json, surah, ayah));
    cache.set(url, entry);
    // Don't pin a failure (e.g. offline) in the cache — a retry should really retry.
    entry.catch(() => cache.delete(url));
  }
  return entry;
}
