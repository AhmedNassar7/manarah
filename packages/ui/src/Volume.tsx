import { createContext, useContext, useRef } from "react";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

/**
 * One volume for everything the app plays (the radio, the Quran recitation, the azkar
 * recordings). The app supplies it through VolumeProvider; a control placed anywhere reads and sets
 * it. Where the device does not let a page set the volume (an iPhone — its own buttons do that) there
 * is nothing to control, so the control draws nothing.
 */
export interface VolumeState {
  /** 0 (silent) to 1 (full). */
  volume: number;
  setVolume: (volume: number) => void;
  /** The device lets the page set the volume. */
  canSet: boolean;
}

const VolumeContext = createContext<VolumeState>({ volume: 1, setVolume: () => {}, canSet: false });

export const VolumeProvider = VolumeContext.Provider;

export function useVolume(): VolumeState {
  return useContext(VolumeContext);
}

/** A mute button and a slider. Un-muting returns to the volume it had before. */
export function VolumeControl({ className }: { className?: string }) {
  const { t, language } = useTranslation();
  const { volume, setVolume, canSet } = useVolume();
  const before = useRef(0.7);

  if (!canSet) return null;
  const muted = volume === 0;
  if (!muted) before.current = volume;
  const percent = Math.round(volume * 100);

  return (
    <div className={`volume-control${className ? ` ${className}` : ""}`} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <button type="button" className="volume-mute" aria-pressed={muted} aria-label={muted ? t("volume.unmute") : t("volume.mute")} onClick={() => setVolume(muted ? before.current : 0)}>
        <Icon name={muted ? "sound-off" : "sound-on"} size={20} />
      </button>
      <input
        type="range"
        className="volume-slider"
        min={0}
        max={100}
        step={5}
        value={percent}
        aria-label={t("volume.label")}
        aria-valuetext={`${percent}%`}
        style={{ "--volume": `${percent}%` } as React.CSSProperties}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
      />
    </div>
  );
}
