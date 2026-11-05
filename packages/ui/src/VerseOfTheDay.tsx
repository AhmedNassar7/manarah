import type { Surah, Verse } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface VerseOfTheDayProps {
  verse: Verse;
  surah: Surah;
}

/** The extension's new-tab centerpiece — one verse, large and legible, with its reference. */
export function VerseOfTheDay({ verse, surah }: VerseOfTheDayProps) {
  const { language } = useTranslation();
  return (
    <figure className="verse-of-the-day" dir="rtl" lang="ar">
      <blockquote>{verse.uthmaniText}</blockquote>
      <figcaption dir={language === "ar" ? "rtl" : "ltr"}>
        {language === "ar" ? surah.nameArabic : surah.nameTransliterated} {verse.surah}:{verse.ayah}
      </figcaption>
    </figure>
  );
}
