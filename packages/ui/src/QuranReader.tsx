import { useEffect, useRef, useState } from "react";
import {
  formatVerseForSharing,
  getAnnotation,
  type Surah,
  type Translation,
  type Verse,
  type VerseAnnotations,
} from "@manarah/core";
import { formatVerseCount, useTranslation } from "./i18n/index.js";
import { VerseActions } from "./VerseActions.js";

export interface QuranReaderProps {
  surah: Surah;
  verses: Verse[];
  /** Same surah's translation text, one entry per verse; omitted while it's still loading or none is available. */
  translations?: Translation[];
  /** An ayah to reveal (past the batched "Load more" cutoff if needed), scroll into view, and briefly highlight — set by Ayah/Juz'/Page navigation, which can land anywhere in a long surah. */
  focusAyah?: number;
  /** The ayah currently sounding from QuranAudioPlayer, if any — reveals it past the batch cutoff and keeps it highlighted for as long as it's playing (unlike focusAyah's highlight, which fades after a few seconds). */
  playingAyah?: number | null;
  /** Renders a small play button on each verse; omitted entirely when no audio player is wired up. */
  onPlayAyah?: (ayah: number) => void;
  /** The user's bookmarks/notes; verses in this surah that have one show a ribbon and/or their note inline. */
  annotations?: VerseAnnotations;
  /** Enables the Bookmark button in each verse's action toolbar. */
  onToggleBookmark?: (ayah: number) => void;
  /** Enables the note editor in each verse's action toolbar. */
  onSaveNote?: (ayah: number, note: string) => void;
}

/** Verses shown before a "Load more" is needed — keeps a 200+ ayah surah (e.g. Al-Baqara) from rendering its entire text, and the whole page, in one go. */
const BATCH_SIZE = 40;

/** Renders one surah's Uthmani text, verse by verse, in a scrollable, batched view. Shared across web/extension/desktop/mobile. */
export function QuranReader({
  surah,
  verses,
  translations,
  focusAyah,
  playingAyah,
  onPlayAyah,
  annotations = {},
  onToggleBookmark,
  onSaveNote,
}: QuranReaderProps) {
  const { t, language } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, verses.length));
  const [showTranslation, setShowTranslation] = useState(true);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);
  /** At most one verse's action toolbar is open at a time. */
  const [actionsAyah, setActionsAyah] = useState<number | null>(null);
  const verseRefs = useRef(new Map<number, HTMLLIElement>());

  // A new surah means a new verses array — restart pagination rather than
  // carrying over how far the previous surah was scrolled.
  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, verses.length));
    setActionsAyah(null);
  }, [surah.number, verses]);

  // A focusAyah past the current batch needs its batch revealed first — this
  // runs before the scroll effect below, which waits for that to land.
  useEffect(() => {
    if (focusAyah == null) return;
    setVisibleCount((n) => Math.max(n, Math.min(focusAyah, verses.length)));
  }, [focusAyah, surah.number, verses.length]);

  useEffect(() => {
    if (focusAyah == null || focusAyah > visibleCount) return;
    const el = verseRefs.current.get(focusAyah);
    if (!el) return;

    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightedAyah(focusAyah);
    const timeout = setTimeout(() => setHighlightedAyah(null), 2000);
    return () => clearTimeout(timeout);
  }, [focusAyah, visibleCount]);

  // Same batch-reveal need as focusAyah — surah playback can advance past
  // what's currently rendered in a long surah.
  useEffect(() => {
    if (playingAyah == null) return;
    setVisibleCount((n) => Math.max(n, Math.min(playingAyah, verses.length)));
  }, [playingAyah, surah.number, verses.length]);

  useEffect(() => {
    if (playingAyah == null || playingAyah > visibleCount) return;
    verseRefs.current.get(playingAyah)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [playingAyah, visibleCount]);

  const visibleVerses = verses.slice(0, visibleCount);
  const hasMore = visibleCount < verses.length;
  const translationByAyah = new Map(translations?.map((tr) => [tr.ayah, tr.text]));
  const surahName = language === "ar" ? surah.nameArabic : surah.nameTransliterated;

  return (
    <section className="quran-reader" dir="rtl" lang="ar">
      <h2>{surah.nameArabic}</h2>
      <p>
        <span dir="ltr">{surah.nameTransliterated}</span> · {t(`quran.revelation.${surah.revelationType}`)} ·{" "}
        {formatVerseCount(language, surah.verseCount)}
      </p>
      {translations && translations.length > 0 && (
        <button
          type="button"
          className="quran-reader-translation-toggle"
          dir={language === "ar" ? "rtl" : "ltr"}
          lang={language}
          onClick={() => setShowTranslation((v) => !v)}
        >
          {showTranslation ? t("quranReader.hideTranslation") : t("quranReader.showTranslation")}
        </button>
      )}
      <div className="quran-reader-scroll">
        <ol>
          {visibleVerses.map((verse) => {
            const annotation = getAnnotation(annotations, surah.number, verse.ayah);
            const translation = showTranslation ? translationByAyah.get(verse.ayah) : undefined;
            const classNames = [
              verse.ayah === playingAyah
                ? "quran-reader-verse-playing"
                : verse.ayah === highlightedAyah
                  ? "quran-reader-verse-highlight"
                  : undefined,
              annotation?.bookmarked ? "quran-reader-verse-bookmarked" : undefined,
            ].filter(Boolean);
            return (
              <li
                key={verse.ayah}
                value={verse.ayah}
                ref={(el) => {
                  if (el) verseRefs.current.set(verse.ayah, el);
                  else verseRefs.current.delete(verse.ayah);
                }}
                className={classNames.length > 0 ? classNames.join(" ") : undefined}
              >
                <div className="quran-reader-verse-controls" dir="ltr">
                  {onPlayAyah && (
                    <button
                      type="button"
                      className="quran-reader-play-button"
                      dir="ltr"
                      aria-label={t("quranReader.playAyah", {
                        ayah: verse.ayah,
                      })}
                      onClick={() => onPlayAyah(verse.ayah)}
                    >
                      ▶
                    </button>
                  )}
                  <button
                    type="button"
                    className="quran-reader-actions-button"
                    aria-label={t("quranReader.verseActions", {
                      ayah: verse.ayah,
                    })}
                    aria-expanded={actionsAyah === verse.ayah}
                    onClick={() => setActionsAyah((current) => (current === verse.ayah ? null : verse.ayah))}
                  >
                    ⋯
                  </button>
                </div>
                <span className="quran-reader-verse-text">
                  {verse.uthmaniText}
                  {translation !== undefined && (
                    <p className="quran-reader-translation" dir="ltr" lang="en">
                      {translation}
                    </p>
                  )}
                  {annotation?.note && (
                    <p className="quran-reader-note" dir="auto">
                      {annotation.note}
                    </p>
                  )}
                  {actionsAyah === verse.ayah && (
                    <VerseActions
                      key={`${surah.number}:${verse.ayah}`}
                      ayah={verse.ayah}
                      shareText={formatVerseForSharing(verse, surahName, translation)}
                      bookmarked={annotation?.bookmarked ?? false}
                      note={annotation?.note}
                      onToggleBookmark={onToggleBookmark && (() => onToggleBookmark(verse.ayah))}
                      onSaveNote={onSaveNote && ((note) => onSaveNote(verse.ayah, note))}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {hasMore && (
          <button
            type="button"
            className="quran-reader-load-more"
            onClick={() => setVisibleCount((n) => Math.min(n + BATCH_SIZE, verses.length))}
          >
            <span dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
              {t("quranReader.loadMore", {
                shown: visibleCount,
                total: verses.length,
              })}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
