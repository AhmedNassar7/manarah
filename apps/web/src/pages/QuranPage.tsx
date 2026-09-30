import { useRef, useState } from "react";
import type { Surah, Translation, Verse, VerseAnnotations, VerseRef } from "@manarah/core";
import { JUZ_COUNT, PAGE_COUNT, RECITERS, SURAHS } from "@manarah/data";
import {
  QuranAudioPlayer,
  QuranBookmarks,
  QuranNavigator,
  QuranReader,
  useTranslation,
  type QuranAudioPlayerHandle,
} from "@manarah/ui";

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
  verseAnnotations: VerseAnnotations;
  onToggleBookmark: (surah: number, ayah: number) => void;
  onSaveNote: (surah: number, ayah: number, note: string) => void;
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
  verseAnnotations,
  onToggleBookmark,
  onSaveNote,
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
      <QuranBookmarks annotations={verseAnnotations} surahs={SURAHS} onSelect={onNavigate} />
      {selectedSurah && selectedSurahVerses && (
        <>
          <QuranReader
            surah={selectedSurah}
            verses={selectedSurahVerses}
            translations={selectedSurahTranslation ?? undefined}
            focusAyah={focusAyah}
            playingAyah={playingAyah}
            onPlayAyah={(ayah) => audioPlayerRef.current?.playAyah(ayah)}
            annotations={verseAnnotations}
            onToggleBookmark={(ayah) => onToggleBookmark(selectedSurah.number, ayah)}
            onSaveNote={(ayah, note) => onSaveNote(selectedSurah.number, ayah, note)}
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
