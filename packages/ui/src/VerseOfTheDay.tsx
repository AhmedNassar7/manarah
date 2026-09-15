import type { Surah, Verse } from "@manarah/core";

export interface VerseOfTheDayProps {
  verse: Verse;
  surah: Surah;
}

/** The extension's new-tab centerpiece — one verse, large and legible, with its reference. */
export function VerseOfTheDay({ verse, surah }: VerseOfTheDayProps) {
  return (
    <figure dir="rtl" lang="ar">
      <blockquote>{verse.uthmaniText}</blockquote>
      <figcaption dir="ltr">
        {surah.nameTransliterated} {verse.surah}:{verse.ayah}
      </figcaption>
    </figure>
  );
}
