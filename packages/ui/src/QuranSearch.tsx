import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MIN_SEARCH_QUERY_LENGTH,
  parseVerseReference,
  type QuranSearchHit,
  type QuranSearchResponse,
  type Surah,
  type VerseRef,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

const PAGE_SIZE = 50;

export interface QuranSearchProps {
  surahs: Surah[];
  /** Runs a full-text search; `limit` caps the returned hits (the response's `total` still counts them all). May load its backing data lazily. */
  search: (query: string, limit: number) => Promise<QuranSearchResponse>;
  /** Called with the chosen verse — the caller navigates the reader there. */
  onSelect: (ref: VerseRef) => void;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; response: QuranSearchResponse };

/**
 * Search box over the whole Quran: Arabic text (without needing harakat) or
 * the English translation, as you type. A "2:255" query is treated as a
 * jump to that verse instead. Selecting a result navigates the reader there.
 *
 * Searching itself is injected (`search`) so this stays platform-agnostic;
 * the app wires it to the bundled-data index.
 */
export function QuranSearch({ surahs, search, onSelect }: QuranSearchProps) {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const latestRequest = useRef(0);

  const trimmed = query.trim();
  const reference = parseVerseReference(trimmed, surahs);
  const searchable = reference === undefined && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;

  useEffect(() => {
    const request = ++latestRequest.current;
    if (!searchable) {
      setState({ status: "idle" });
      return;
    }
    // Keep the previous results on screen while a "show more" or next keystroke is in flight.
    setState((prev) => (prev.status === "done" ? prev : { status: "loading" }));
    search(trimmed, limit).then(
      (response) => {
        if (request === latestRequest.current) setState({ status: "done", response });
      },
      () => {
        if (request === latestRequest.current) setState({ status: "error" });
      }
    );
  }, [searchable, trimmed, limit, search]);

  function surahLabel(surahNumber: number): string {
    const surah = surahs.find((s) => s.number === surahNumber);
    if (!surah) return String(surahNumber);
    return language === "ar" ? surah.nameArabic : surah.nameTransliterated;
  }

  function select(ref: VerseRef) {
    onSelect(ref);
    setQuery("");
    setLimit(PAGE_SIZE);
  }

  return (
    <div className="quran-search" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <input
        type="search"
        role="searchbox"
        className="quran-search-input"
        aria-label={t("quranSearch.label")}
        placeholder={t("quranSearch.placeholder")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE_SIZE);
        }}
        dir="auto"
      />

      {reference && (
        <ul className="quran-search-results">
          <li>
            <button type="button" onClick={() => select(reference)}>
              <span className="quran-search-ref">
                {t("quranSearch.goTo", { surah: surahLabel(reference.surah), ayah: reference.ayah })}
              </span>
            </button>
          </li>
        </ul>
      )}

      {searchable && state.status === "loading" && <p className="quran-search-status">{t("quranSearch.searching")}</p>}
      {searchable && state.status === "error" && (
        <p className="quran-search-status" role="alert">
          {t("quranSearch.error")}
        </p>
      )}
      {searchable && state.status === "done" && (
        <>
          {state.response.total === 0 ? (
            <p className="quran-search-status">{t("quranSearch.noResults")}</p>
          ) : (
            <>
              <p className="quran-search-status" role="status">
                {t("quranSearch.resultCount", { count: state.response.total })}
              </p>
              <ul className="quran-search-results">
                {state.response.hits.map((hit) => (
                  <li key={`${hit.surah}:${hit.ayah}`}>
                    <button type="button" onClick={() => select({ surah: hit.surah, ayah: hit.ayah })}>
                      <span className="quran-search-ref">
                        {t("quranSearch.verseLabel", { surah: surahLabel(hit.surah), ayah: hit.ayah })}
                      </span>
                      <span className="quran-search-arabic" dir="rtl" lang="ar">
                        {hit.field === "arabic" ? highlight(hit.uthmaniText, hit.ranges) : hit.uthmaniText}
                      </span>
                      {hit.translation !== undefined && (
                        <span className="quran-search-translation" dir="ltr" lang="en">
                          {hit.field === "translation" ? highlight(hit.translation, hit.ranges) : hit.translation}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {state.response.total > state.response.hits.length && (
                <button type="button" className="quran-search-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  {t("quranSearch.showMore", {
                    shown: state.response.hits.length,
                    total: state.response.total,
                  })}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Wraps each [start, end) range of `text` in a <mark>; ranges are sorted and non-overlapping. */
function highlight(text: string, ranges: QuranSearchHit["ranges"]): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={i}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
