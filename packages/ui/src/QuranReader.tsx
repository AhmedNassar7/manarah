import { useEffect, useState } from "react";
import type { Surah, Verse } from "@manarah/core";
import { formatVerseCount, useTranslation } from "./i18n/index.js";

export interface QuranReaderProps {
  surah: Surah;
  verses: Verse[];
}

/** Verses shown before a "Load more" is needed — keeps a 200+ ayah surah (e.g. Al-Baqara) from rendering its entire text, and the whole page, in one go. */
const BATCH_SIZE = 40;

/** Renders one surah's Uthmani text, verse by verse, in a scrollable, batched view. Shared across web/extension/desktop/mobile. */
export function QuranReader({ surah, verses }: QuranReaderProps) {
  const { t, language } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, verses.length));

  // A new surah means a new verses array — restart pagination rather than
  // carrying over how far the previous surah was scrolled.
  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, verses.length));
  }, [surah.number, verses]);

  const visibleVerses = verses.slice(0, visibleCount);
  const hasMore = visibleCount < verses.length;

  return (
    <section className="quran-reader" dir="rtl" lang="ar">
      <h2>{surah.nameArabic}</h2>
      <p>
        <span dir="ltr">{surah.nameTransliterated}</span> · {t(`quran.revelation.${surah.revelationType}`)} ·{" "}
        {formatVerseCount(language, surah.verseCount)}
      </p>
      <div className="quran-reader-scroll">
        <ol>
          {visibleVerses.map((verse) => (
            <li key={verse.ayah} value={verse.ayah}>
              {verse.uthmaniText}
            </li>
          ))}
        </ol>
        {hasMore && (
          <button
            type="button"
            className="quran-reader-load-more"
            onClick={() => setVisibleCount((n) => Math.min(n + BATCH_SIZE, verses.length))}
          >
            <span dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
              {t("quranReader.loadMore", { shown: visibleCount, total: verses.length })}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
