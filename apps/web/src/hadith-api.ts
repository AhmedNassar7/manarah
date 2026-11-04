import {
  fetchJsonWithFallback,
  hadithSectionUrls,
  mergeHadithEditions,
  parseHadithSectionResponse,
  type HadithCollection,
  type HadithEntry,
  type HadithText,
} from "@manarah/core";

/**
 * Runtime loader for hadith text — far too big to bundle (a whole edition is
 * 5–9 MB), so one book at a time (≤ ~340 KB) from the hadith-api CDN. The
 * Arabic and English editions are fetched in parallel and paired by hadith
 * number. In-memory cache for this session, keyed by URL; across sessions and
 * offline the service worker's runtime cache (vite.config.ts) serves any book
 * already read.
 */
const cache = new Map<string, Promise<HadithText[]>>();

function loadEdition(editionId: string, section: number): Promise<HadithText[]> {
  const key = `${editionId}/${section}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = fetchJsonWithFallback(hadithSectionUrls(editionId, section), (url) => fetch(url)).then(parseHadithSectionResponse);
    cache.set(key, entry);
    // Don't pin a failure (e.g. offline) — a retry should really retry.
    entry.catch(() => cache.delete(key));
  }
  return entry;
}

/**
 * One book of a collection, Arabic and English paired. If only one edition
 * loads, the book is still shown with that edition's text (and the other's
 * absence simply hides the translation); if both fail, this rejects.
 */
export async function loadHadithSection(collection: HadithCollection, section: number): Promise<HadithEntry[]> {
  const [arabic, english] = await Promise.allSettled([
    loadEdition(collection.arabicEdition, section),
    loadEdition(collection.englishEdition, section),
  ]);
  if (arabic.status === "rejected" && english.status === "rejected") throw arabic.reason;
  return mergeHadithEditions(
    arabic.status === "fulfilled" ? arabic.value : [],
    english.status === "fulfilled" ? english.value : []
  );
}
