import { useRef, useState } from "react";
import {
  readerFontScale,
  resolveTafsirEdition,
  type ReciterStyle,
  type Surah,
  type Translation,
  type Verse,
  type VerseAnnotations,
  type VerseRef,
} from "@manarah/core";
import { JUZ_COUNT, PAGE_COUNT, RECITERS, SURAHS, TAFSIR_EDITIONS, TRANSLATION_AUDIO, searchQuran } from "@manarah/data";
import {
  QuranAudioPlayer,
  QuranBookmarks,
  QuranNavigator,
  QuranReader,
  QuranSearch,
  ReadingSettings,
  useTranslation,
  type QuranAudioPlayerHandle,
} from "@manarah/ui";
import { loadTafsir, loadWords } from "../quran-com.js";

/** Module-level so QuranSearch's effect sees a stable function and doesn't re-search on every render. */
function runSearch(query: string, limit: number) {
  return searchQuran(query, undefined, { limit });
}

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
  reciterStyle: ReciterStyle;
  onReciterStyleChange: (style: ReciterStyle) => void;
  translationAudio: boolean;
  onTranslationAudioChange: (enabled: boolean) => void;
  verseAnnotations: VerseAnnotations;
  onToggleBookmark: (surah: number, ayah: number) => void;
  onSaveNote: (surah: number, ayah: number, note: string) => void;
  tafsirEditionId: string | undefined;
  onTafsirEditionChange: (id: string) => void;
  readerFontStep: number;
  onReaderFontStepChange: (step: number) => void;
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
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
  reciterStyle,
  onReciterStyleChange,
  translationAudio,
  onTranslationAudioChange,
  verseAnnotations,
  onToggleBookmark,
  onSaveNote,
  tafsirEditionId,
  onTafsirEditionChange,
  readerFontStep,
  onReaderFontStepChange,
  showTranslation,
  onShowTranslationChange,
}: QuranPageProps) {
  const { t, language } = useTranslation();
  const tafsirEdition = resolveTafsirEdition(TAFSIR_EDITIONS, tafsirEditionId, language);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const audioPlayerRef = useRef<QuranAudioPlayerHandle>(null);

  return (
    <>
      <h2 className="section-title">{t("app.sectionQuran")}</h2>
      <div className="quran-layout">
      <aside className="quran-tools">
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
      <QuranSearch surahs={SURAHS} search={runSearch} onSelect={onNavigate} />
      <ReadingSettings
        fontStep={readerFontStep}
        onFontStepChange={onReaderFontStepChange}
        showTranslation={showTranslation}
        onShowTranslationChange={onShowTranslationChange}
        reciters={RECITERS}
        reciterId={reciterId}
        onReciterChange={onReciterChange}
        reciterStyle={reciterStyle}
        onReciterStyleChange={onReciterStyleChange}
      />
      <QuranBookmarks annotations={verseAnnotations} surahs={SURAHS} onSelect={onNavigate} />
      </aside>
      <div className="quran-main">
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
            tafsir={
              tafsirEdition && {
                editions: TAFSIR_EDITIONS,
                editionId: tafsirEdition.id,
                onEditionChange: onTafsirEditionChange,
                load: loadTafsir,
              }
            }
            loadWords={loadWords}
            fontScale={readerFontScale(readerFontStep)}
            showTranslation={showTranslation}
            onShowTranslationChange={onShowTranslationChange}
          />
          <QuranAudioPlayer
            ref={audioPlayerRef}
            reciters={RECITERS}
            reciterId={reciterId}
            onReciterChange={onReciterChange}
            reciterStyle={reciterStyle}
            onReciterStyleChange={onReciterStyleChange}
            translationAudio={TRANSLATION_AUDIO}
            translationAudioEnabled={translationAudio}
            onTranslationAudioEnabledChange={onTranslationAudioChange}
            surah={selectedSurah}
            verses={selectedSurahVerses}
            onPlayingAyahChange={setPlayingAyah}
          />
        </>
      )}
      </div>
      </div>
    </>
  );
}
