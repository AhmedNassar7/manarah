import type { Surah, Verse } from "@manarah/core";

export interface QuranReaderProps {
  surah: Surah;
  verses: Verse[];
}

/** Renders one surah's Uthmani text, verse by verse. Shared across web/extension/desktop/mobile. */
export function QuranReader({ surah, verses }: QuranReaderProps) {
  return (
    <section className="quran-reader" dir="rtl" lang="ar">
      <h2>{surah.nameArabic}</h2>
      <p>
        {surah.nameTransliterated} · {surah.revelationType} · {surah.verseCount} verses
      </p>
      <ol>
        {verses.map((verse) => (
          <li key={verse.ayah} value={verse.ayah}>
            {verse.uthmaniText}
          </li>
        ))}
      </ol>
    </section>
  );
}
