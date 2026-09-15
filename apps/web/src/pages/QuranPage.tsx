import type { Surah, Translation, Verse, VerseRef } from "@manarah/core";
import { JUZ_COUNT, PAGE_COUNT, SURAHS } from "@manarah/data";
import { QuranNavigator, QuranReader, useTranslation } from "@manarah/ui";

export interface QuranPageProps {
  selectedSurahNumber: number | null;
  focusAyah: number | undefined;
  selectedSurah: Surah | undefined;
  selectedSurahVerses: Verse[] | null;
  selectedSurahTranslation: Translation[] | null;
  onNavigate: (ref: VerseRef) => void;
  resolveJuzStart: (juz: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
  resolvePageStart: (page: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
}

export function QuranPage({
  selectedSurahNumber,
  focusAyah,
  selectedSurah,
  selectedSurahVerses,
  selectedSurahTranslation,
  onNavigate,
  resolveJuzStart,
  resolvePageStart,
}: QuranPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionQuran")}</h2>
      <QuranNavigator
        surahs={SURAHS}
        currentSurahNumber={selectedSurahNumber ?? 1}
        currentSurahVerseCount={selectedSurah?.verseCount ?? 0}
        onNavigate={onNavigate}
        resolveJuzStart={resolveJuzStart}
        resolvePageStart={resolvePageStart}
        juzCount={JUZ_COUNT}
        pageCount={PAGE_COUNT}
      />
      {selectedSurah && selectedSurahVerses && (
        <QuranReader
          surah={selectedSurah}
          verses={selectedSurahVerses}
          translations={selectedSurahTranslation ?? undefined}
          focusAyah={focusAyah}
        />
      )}
    </>
  );
}
