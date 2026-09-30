/**
 * Tafsir (Quranic exegesis), fetched per verse at runtime from the Quran.com
 * API (api.quran.com/api/v4) — the full texts run to tens of MB, far past
 * what can be bundled/precached. Verified live 2026-09-30: CORS-enabled
 * (`Access-Control-Allow-Origin: *`), no API key, one entry per verse key.
 *
 * The API returns lightly formatted HTML (`<p>`, `<h2>`, `<span>`). Rather
 * than injecting third-party HTML into the page, it's flattened here into
 * plain-text heading/paragraph blocks that the UI renders as text nodes.
 */

export interface TafsirEdition {
  /** Stable id used in settings, e.g. "ibn-kathir". */
  id: string;
  /** Quran.com API resource id for this tafsir. */
  quranComId: number;
  /** Language of the tafsir text itself. */
  language: "ar" | "en";
}

export interface TafsirBlock {
  kind: "heading" | "paragraph";
  text: string;
}

export interface TafsirEntry {
  /** Verse keys ("2:255") this entry explains — more than one when the tafsir treats a passage as a unit. */
  verseKeys: string[];
  /** Empty when the source has no commentary for this verse on its own. */
  blocks: TafsirBlock[];
}

export function tafsirUrl(edition: TafsirEdition, surah: number, ayah: number): string {
  return `https://api.quran.com/api/v4/tafsirs/${edition.quranComId}/by_ayah/${surah}:${ayah}`;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Block-level tags start a new block; headings are remembered so the block can be styled as one. */
const BLOCK_TAG = /<(\/?)(h[1-6]|p|div|br|li)\b[^>]*>/gi;

/**
 * Flattens tafsir HTML into plain-text blocks. Inline tags (`<span>`, `<b>`,
 * …) are dropped but their text kept; entities are decoded; line breaks in
 * unformatted text (some editions have no markup at all) also split blocks.
 */
export function tafsirHtmlToBlocks(html: string): TafsirBlock[] {
  const blocks: TafsirBlock[] = [];
  let kind: TafsirBlock["kind"] = "paragraph";
  let lastIndex = 0;

  function flush(raw: string) {
    for (const line of raw.split(/\n+/)) {
      const text = decodeEntities(line.replace(/<[^>]*>/g, ""))
        .replace(/\s+/g, " ")
        .trim();
      if (text) blocks.push({ kind, text });
    }
  }

  for (const match of html.matchAll(BLOCK_TAG)) {
    flush(html.slice(lastIndex, match.index));
    lastIndex = match.index! + match[0].length;
    const [, closing, tag] = match;
    kind = !closing && /^h[1-6]$/i.test(tag) ? "heading" : "paragraph";
  }
  flush(html.slice(lastIndex));
  return blocks;
}

/** Shape of the Quran.com `/tafsirs/{id}/by_ayah/{key}` response — only the fields used here. */
interface QuranComTafsirResponse {
  tafsir?: {
    text?: string;
    verses?: Record<string, unknown>;
  };
}

export function parseTafsirResponse(json: unknown, surah: number, ayah: number): TafsirEntry {
  const tafsir = (json as QuranComTafsirResponse | null)?.tafsir;
  const verseKeys = tafsir?.verses ? Object.keys(tafsir.verses) : [];
  return {
    verseKeys: verseKeys.length > 0 ? verseKeys : [`${surah}:${ayah}`],
    blocks: tafsirHtmlToBlocks(tafsir?.text ?? ""),
  };
}

/**
 * The edition to show: the user's saved choice if it still exists, else the
 * first edition written in the UI language (so an English reader isn't
 * handed Arabic-only commentary by default), else the first edition.
 */
export function resolveTafsirEdition(
  editions: TafsirEdition[],
  preferredId: string | undefined,
  language: string
): TafsirEdition | undefined {
  return editions.find((e) => e.id === preferredId) ?? editions.find((e) => e.language === language) ?? editions[0];
}
