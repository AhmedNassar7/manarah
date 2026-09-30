import { listAnnotations, verseKey, type Surah, type VerseAnnotations, type VerseRef } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface QuranBookmarksProps {
  annotations: VerseAnnotations;
  surahs: Surah[];
  onSelect: (ref: VerseRef) => void;
}

/** Collapsible list of every bookmarked or annotated verse, in mushaf order — selecting one jumps the reader there. */
export function QuranBookmarks({ annotations, surahs, onSelect }: QuranBookmarksProps) {
  const { t, language } = useTranslation();
  const entries = listAnnotations(annotations);
  const surahByNumber = new Map(surahs.map((s) => [s.number, s]));

  return (
    <details className="quran-bookmarks" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <summary>{t("quranBookmarks.title", { count: entries.length })}</summary>
      {entries.length === 0 ? (
        <p className="quran-bookmarks-empty">{t("quranBookmarks.empty")}</p>
      ) : (
        <ul>
          {entries.map((entry) => {
            const surah = surahByNumber.get(entry.surah);
            const surahName = surah
              ? language === "ar"
                ? surah.nameArabic
                : surah.nameTransliterated
              : String(entry.surah);
            return (
              <li key={verseKey(entry.surah, entry.ayah)}>
                <button type="button" onClick={() => onSelect({ surah: entry.surah, ayah: entry.ayah })}>
                  <span className="quran-bookmarks-ref">
                    {entry.bookmarked && <span className="quran-bookmarks-ribbon" aria-hidden="true" />}
                    {t("quranBookmarks.verseLabel", { surah: surahName, ayah: entry.ayah })}
                  </span>
                  {entry.note && <span className="quran-bookmarks-note">{entry.note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
