import { useRef, useState } from "react";
import type { Surah, Translation, Verse, VerseRef } from "@manarah/core";
import { JUZ_COUNT, PAGE_COUNT, RECITERS, SURAHS } from "@manarah/data";
import { QuranAudioPlayer, QuranNavigator, QuranReader, useTranslation, type QuranAudioPlayerHandle } from "@manarah/ui";

export interface QuranPageProps {
  selectedSurahNumber: number | null;
  focusAyah: number | undefined;
  selectedSurah: Surah | undefined;
  selectedSurahVerses: Verse[] | null;
  selectedSurahTranslation: Translation[] | null;
  onNavigate: (ref: VerseRef) => void;
  resolveJuzStart: (juz: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
  resolvePageStart: (page: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
  reciterId: string;
  onReciterChange: (id: string) => void;
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
  reciterId,
  onReciterChange,
}: QuranPageProps) {
  const { t } = useTranslation();
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const audioPlayerRef = useRef<QuranAudioPlayerHandle>(null);

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
        <>
          <QuranReader
            surah={selectedSurah}
            verses={selectedSurahVerses}
            translations={selectedSurahTranslation ?? undefined}
            focusAyah={focusAyah}
            playingAyah={playingAyah}
            onPlayAyah={(ayah) => audioPlayerRef.current?.playAyah(ayah)}
          />
          <QuranAudioPlayer
            ref={audioPlayerRef}
            reciters={RECITERS}
            reciterId={reciterId}
            onReciterChange={onReciterChange}
            surah={selectedSurah}
            verses={selectedSurahVerses}
            onPlayingAyahChange={setPlayingAyah}
          />
        </>
      )}
    </>
  );
}
