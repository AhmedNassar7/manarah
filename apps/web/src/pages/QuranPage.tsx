import type { Surah, Translation, Verse } from "@manarah/core";
import { SURAHS } from "@manarah/data";
import { QuranReader, SurahList, useTranslation } from "@manarah/ui";

export interface QuranPageProps {
  selectedSurahNumber: number | null;
  selectedSurah: Surah | undefined;
  selectedSurahVerses: Verse[] | null;
  selectedSurahTranslation: Translation[] | null;
  onSurahSelect: (surahNumber: number) => void;
}

export function QuranPage({
  selectedSurahNumber,
  selectedSurah,
  selectedSurahVerses,
  selectedSurahTranslation,
  onSurahSelect,
}: QuranPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionQuran")}</h2>
      <SurahList surahs={SURAHS} onSelect={onSurahSelect} selectedSurah={selectedSurahNumber ?? undefined} />
      {selectedSurah && selectedSurahVerses && (
        <QuranReader surah={selectedSurah} verses={selectedSurahVerses} translations={selectedSurahTranslation ?? undefined} />
      )}
    </>
  );
}
