import type { Surah } from "@manarah/core";
import { formatVerseCount, useTranslation } from "./i18n/index.js";

export interface SurahListProps {
  surahs: Surah[];
  onSelect: (surahNumber: number) => void;
  selectedSurah?: number;
}

/** A browsable list of all 114 surahs — the entry point into reading anything besides whatever's hardcoded as a default. */
export function SurahList({ surahs, onSelect, selectedSurah }: SurahListProps) {
  const { language } = useTranslation();

  return (
    <ol className="surah-list">
      {surahs.map((surah) => (
        <li key={surah.number} value={surah.number}>
          <button
            type="button"
            aria-current={surah.number === selectedSurah ? "true" : undefined}
            onClick={() => onSelect(surah.number)}
          >
            <span dir="rtl" lang="ar">
              {surah.nameArabic}
            </span>{" "}
            <span>
              {surah.nameTransliterated} · {formatVerseCount(language, surah.verseCount)}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
