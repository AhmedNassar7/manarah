import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ayahAudioUrl, type Reciter, type Surah, type Verse } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

const REPEAT_OPTIONS = [1, 2, 3, 5];
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export interface QuranAudioPlayerHandle {
  /** Starts playing the given ayah (e.g. from a per-verse play button in QuranReader). */
  playAyah: (ayah: number) => void;
}

export interface QuranAudioPlayerProps {
  reciters: Reciter[];
  reciterId: string;
  onReciterChange: (id: string) => void;
  surah: Surah;
  /** The surah's verses, in ayah order — defines what "next"/"previous" and end-of-surah mean. */
  verses: Verse[];
  /** Notified with the ayah currently sounding (null when paused/stopped), for QuranReader's playingAyah highlight. */
  onPlayingAyahChange: (ayah: number | null) => void;
}

/**
 * A persistent playback bar for Quran recitation: reciter choice, verse
 * repeat count, speed, and play/pause/prev/next — built entirely on
 * EveryAyah.com's per-verse audio files (no surah-wide file + timestamp
 * data needed), so the currently-playing ayah is always known exactly,
 * which is what lets QuranReader highlight/auto-scroll to it for free.
 * Exposes `playAyah` via ref so a per-verse "play" button elsewhere in the
 * page can start playback at a specific verse.
 */
export const QuranAudioPlayer = forwardRef<QuranAudioPlayerHandle, QuranAudioPlayerProps>(function QuranAudioPlayer(
  { reciters, reciterId, onReciterChange, surah, verses, onPlayingAyahChange },
  ref
) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatsRemaining, setRepeatsRemaining] = useState(1);
  const [speed, setSpeed] = useState(1);

  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];

  useEffect(() => {
    onPlayingAyahChange(isPlaying ? currentAyah : null);
  }, [isPlaying, currentAyah, onPlayingAyahChange]);

  // Stopping the surah (leaving the page, switching surah) shouldn't leave a
  // stale "now playing" verse pointing at a surah that's no longer shown.
  useEffect(() => {
    setCurrentAyah(null);
    setIsPlaying(false);
  }, [surah.number]);

  function playAyah(ayah: number, repeats: number = repeatCount) {
    setRepeatsRemaining(repeats);
    setIsPlaying(true);
    setCurrentAyah(ayah);
  }

  useImperativeHandle(ref, () => ({ playAyah: (ayah: number) => playAyah(ayah) }));

  // Loads and plays from the start whenever the target ayah or reciter
  // changes. Deliberately excludes `isPlaying` — a plain pause/resume must
  // not reload the file and restart from 0, see handlePlayPause below.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || currentAyah == null || !reciter) return;
    audio.src = ayahAudioUrl(reciter, surah.number, currentAyah);
    audio.playbackRate = speed;
    void audio.play();
    // `speed` is read here (a fresh load starts at the current rate) but
    // deliberately left out of the dependency list — a speed change
    // mid-verse is handled by the effect right below instead, without
    // reloading/restarting the audio from 0.
  }, [currentAyah, reciter, surah.number]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  function currentIndex(): number {
    return verses.findIndex((v) => v.ayah === currentAyah);
  }

  function handleEnded() {
    if (repeatsRemaining > 1) {
      setRepeatsRemaining((n) => n - 1);
      void audioRef.current?.play();
      return;
    }
    const next = verses[currentIndex() + 1];
    if (next) {
      playAyah(next.ayah);
    } else {
      setIsPlaying(false);
    }
  }

  function handlePlayPause() {
    if (currentAyah == null) {
      const first = verses[0];
      if (first) playAyah(first.ayah);
      return;
    }
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current?.play();
      setIsPlaying(true);
    }
  }

  function handlePrevious() {
    const prev = verses[currentIndex() - 1];
    if (prev) playAyah(prev.ayah);
  }

  function handleNext() {
    const next = verses[currentIndex() + 1];
    if (next) playAyah(next.ayah);
  }

  function handleStop() {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentAyah(null);
  }

  const hasPrevious = currentAyah != null && currentIndex() > 0;
  const hasNext = currentAyah != null && currentIndex() < verses.length - 1;

  return (
    <div className="quran-audio-player">
      <audio ref={audioRef} onEnded={handleEnded} />

      <div className="quran-audio-player-transport">
        <button type="button" onClick={handlePrevious} disabled={!hasPrevious} aria-label={t("quranAudioPlayer.previous")}>
          ⏮
        </button>
        <button
          type="button"
          className="quran-audio-player-play"
          onClick={handlePlayPause}
          aria-label={isPlaying ? t("quranAudioPlayer.pause") : t("quranAudioPlayer.play")}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button type="button" onClick={handleNext} disabled={!hasNext} aria-label={t("quranAudioPlayer.next")}>
          ⏭
        </button>
        <button type="button" onClick={handleStop} disabled={currentAyah == null} aria-label={t("quranAudioPlayer.stop")}>
          ⏹
        </button>
        <span className="quran-audio-player-status">
          {currentAyah != null ? t("quranAudioPlayer.nowPlaying", { ayah: currentAyah }) : t("quranAudioPlayer.idle")}
        </span>
      </div>

      <div className="quran-audio-player-settings">
        <label>
          {t("quranAudioPlayer.reciter")}
          <select value={reciterId} onChange={(event) => onReciterChange(event.target.value)}>
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {t(`reciter.${r.id}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("quranAudioPlayer.repeat")}
          <select value={repeatCount} onChange={(event) => setRepeatCount(Number(event.target.value))}>
            {REPEAT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("quranAudioPlayer.speed")}
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
});
