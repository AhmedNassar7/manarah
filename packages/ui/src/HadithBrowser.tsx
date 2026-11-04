import { useEffect, useRef, useState } from "react";
import {
  formatHadithForSharing,
  type HadithCollection,
  type HadithCollectionId,
  type HadithEntry,
  type HadithSection,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

/** Hadiths rendered before a "Show more" is needed — a book can run to hundreds. */
const BATCH_SIZE = 25;
const COPIED_FEEDBACK_MS = 1800;

export interface HadithBrowserProps {
  collections: HadithCollection[];
  getSections: (collectionId: HadithCollectionId) => HadithSection[];
  /** Fetches one book, Arabic and English paired. May load over the network; rejects on failure. */
  load: (collection: HadithCollection, section: number) => Promise<HadithEntry[]>;
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
}

type LoadState = { status: "loading" } | { status: "error" } | { status: "done"; entries: HadithEntry[] };

/**
 * The hadith library: pick one of the six collections, pick a book, read its
 * hadiths in Arabic with the English translation opt-in (the same
 * Arabic-first setting the Quran reader uses). Gradings are shown only where
 * the source publishes them, each attributed to its scholar.
 */
export function HadithBrowser({ collections, getSections, load, showTranslation, onShowTranslationChange }: HadithBrowserProps) {
  const { t, language } = useTranslation();
  const [collectionId, setCollectionId] = useState<HadithCollectionId>(collections[0].id);
  const [sectionNumber, setSectionNumber] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const latestRequest = useRef(0);

  const collection = collections.find((c) => c.id === collectionId) ?? collections[0];
  const sections = getSections(collection.id);
  const section = sectionNumber === null ? undefined : sections.find((s) => s.number === sectionNumber);
  const collectionName = t(`hadith.collection.${collection.id}`);

  useEffect(() => {
    if (sectionNumber === null) return;
    const request = ++latestRequest.current;
    setState({ status: "loading" });
    setVisibleCount(BATCH_SIZE);
    load(collection, sectionNumber).then(
      (entries) => {
        if (request === latestRequest.current) setState({ status: "done", entries });
      },
      () => {
        if (request === latestRequest.current) setState({ status: "error" });
      }
    );
  }, [collection, sectionNumber, attempt, load]);

  function selectCollection(id: HadithCollectionId) {
    setCollectionId(id);
    setSectionNumber(null);
    setFilter("");
  }

  const trimmed = filter.trim().toLowerCase();
  const filteredSections = !trimmed
    ? sections
    : sections.filter((s) => s.title.toLowerCase().includes(trimmed) || String(s.number) === trimmed);

  return (
    <section className="hadith-browser" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="hadith-tabs" role="tablist" aria-label={t("hadith.collections")}>
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === collection.id}
            className={c.id === collection.id ? "active" : undefined}
            onClick={() => selectCollection(c.id)}
          >
            {t(`hadith.collection.${c.id}`)}
          </button>
        ))}
      </div>

      {section === undefined ? (
        <div className="hadith-books">
          <input
            type="search"
            role="searchbox"
            className="hadith-books-filter"
            aria-label={t("hadith.filterBooks")}
            placeholder={t("hadith.filterBooks")}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {language === "ar" && <p className="hadith-note">{t("hadith.titlesNote")}</p>}
          {filteredSections.length === 0 ? (
            <p className="hadith-status">{t("hadith.noBooks")}</p>
          ) : (
            <ul className="hadith-book-list">
              {filteredSections.map((s) => (
                <li key={s.number}>
                  <button type="button" onClick={() => setSectionNumber(s.number)}>
                    <span className="hadith-book-number">{s.number}</span>
                    <span className="hadith-book-title" dir="ltr" lang="en">
                      {s.title}
                    </span>
                    <span className="hadith-book-count">{t("hadith.count", { count: s.count })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="hadith-reader">
          <div className="hadith-reader-bar">
            <button type="button" className="hadith-back" onClick={() => setSectionNumber(null)}>
              <Icon name="arrow-left" size={16} /> {t("hadith.allBooks")}
            </button>
            <button
              type="button"
              className="hadith-translation-toggle"
              aria-pressed={showTranslation}
              onClick={() => onShowTranslationChange(!showTranslation)}
            >
              {showTranslation ? t("quranReader.hideTranslation") : t("quranReader.showTranslation")}
            </button>
          </div>
          <h3 className="hadith-book-heading" dir="ltr" lang="en">
            {section.number > 0 ? `${section.number}. ` : ""}
            {section.title}
          </h3>

          {state.status === "loading" && (
            <p className="hadith-status" role="status">
              {t("hadith.loading")}
            </p>
          )}
          {state.status === "error" && (
            <div className="hadith-status" role="alert">
              <p>{t("hadith.error")}</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                {t("hadith.retry")}
              </button>
            </div>
          )}
          {state.status === "done" && (
            <>
              <ol className="hadith-list">
                {state.entries.slice(0, visibleCount).map((entry) => (
                  <HadithCard
                    key={entry.number}
                    entry={entry}
                    collectionName={collectionName}
                    showTranslation={showTranslation}
                  />
                ))}
              </ol>
              {visibleCount < state.entries.length && (
                <button type="button" className="hadith-more" onClick={() => setVisibleCount((n) => n + BATCH_SIZE)}>
                  {t("hadith.showMore", { shown: visibleCount, total: state.entries.length })}
                </button>
              )}
              <p className="hadith-note">{t("hadith.source")}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function HadithCard({
  entry,
  collectionName,
  showTranslation,
}: {
  entry: HadithEntry;
  collectionName: string;
  showTranslation: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareText = formatHadithForSharing(entry, collectionName, { includeTranslation: showTranslation });

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      // Clipboard unavailable or denied — nothing useful to show.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ text: shareText });
    } catch {
      // Dismissing the share sheet rejects with AbortError — not worth surfacing.
    }
  }

  return (
    <li className="hadith-card" value={entry.number}>
      <div className="hadith-card-head">
        <span className="hadith-card-number">{t("hadith.hadithLabel", { number: entry.displayNumber })}</span>
        {entry.book !== undefined && entry.inBook !== undefined && (
          <span className="hadith-card-ref">{t("hadith.bookRef", { book: entry.book, number: entry.inBook })}</span>
        )}
      </div>

      {entry.arabic !== undefined && (
        <p className="hadith-arabic" dir="rtl" lang="ar">
          {entry.arabic}
        </p>
      )}
      {(showTranslation || entry.arabic === undefined) && entry.english !== undefined && (
        <p className="hadith-english" dir="ltr" lang="en">
          {entry.english}
        </p>
      )}

      {entry.grades.length > 0 && (
        <ul className="hadith-grades" aria-label={t("hadith.gradings")}>
          {entry.grades.map((g) => (
            <li key={`${g.scholar}:${g.grade}`}>{t("hadith.grade", { scholar: g.scholar, grade: g.grade })}</li>
          ))}
        </ul>
      )}

      <div className="hadith-card-actions">
        <button type="button" onClick={handleCopy}>
          <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? t("verseActions.copied") : t("verseActions.copy")}
        </button>
        {canShare && (
          <button type="button" onClick={handleShare}>
            <Icon name="share" size={16} /> {t("verseActions.share")}
          </button>
        )}
      </div>
    </li>
  );
}
