import { useMemo, useState } from "react";
import { RADIO_GROUPS, filterStations, stationName, type RadioGroup, type RadioStation } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";
import { VolumeControl } from "./Volume.js";

/** Where the player stands. "offline" is a state of its own: the fix (get a connection) differs from a dead station. */
export type RadioStatus = "idle" | "loading" | "playing" | "paused" | "error" | "offline";

type Show = RadioGroup | "favorites" | "all";

/** The line under a station's name: its reading, when one reciter has several stations. */
function useStationLabel() {
  const { t, language } = useTranslation();
  return (station: RadioStation) => {
    const name = stationName(station, language);
    return { name, variant: station.variant ? t(`radio.variant.${station.variant}`) : undefined };
  };
}

function statusText(t: (key: string) => string, status: RadioStatus): string {
  switch (status) {
    case "loading":
      return t("radio.status.loading");
    case "playing":
      return t("radio.status.playing");
    case "paused":
      return t("radio.status.paused");
    case "error":
      return t("radio.status.error");
    case "offline":
      return t("radio.status.offline");
    default:
      return "";
  }
}

export interface RadioBrowserProps {
  stations: RadioStation[];
  favorites: number[];
  /** The station that was last listened to — offered as "Continue" when nothing is playing. */
  lastId?: number;
  /** The station that is loaded in the player (playing, paused, loading or failed). */
  currentId?: number;
  status: RadioStatus;
  onPlay: (station: RadioStation) => void;
  onPause: () => void;
  onResume: () => void;
  onToggleFavorite: (id: number) => void;
}

/**
 * The radio page: what is playing at the top (or "Continue with …" for the last station), a
 * search box, the kinds of station as chips, and the list — one big tap target per station, and a
 * star to keep it. Tapping the station that is playing pauses it. Arabic and English both search
 * either language's names.
 */
export function RadioBrowser({ stations, favorites, lastId, currentId, status, onPlay, onPause, onResume, onToggleFavorite }: RadioBrowserProps) {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const label = useStationLabel();

  const byId = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const current = currentId !== undefined ? byId.get(currentId) : undefined;
  const last = current === undefined && lastId !== undefined ? byId.get(lastId) : undefined;
  const visible = useMemo(() => filterStations(stations, { query, show, favorites, language }), [stations, query, show, favorites, language]);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const chips: { id: Show; label: string }[] = [
    { id: "all", label: t("radio.show.all") },
    { id: "favorites", label: `${t("radio.show.favorites")}${favorites.length ? ` (${favorites.length})` : ""}` },
    ...RADIO_GROUPS.map((g) => ({ id: g, label: t(`radio.show.${g}`) })),
  ];

  function toggleRow(station: RadioStation) {
    if (station.id !== currentId) onPlay(station);
    else if (status === "playing" || status === "loading") onPause();
    else if (status === "error" || status === "offline") onPlay(station);
    else onResume();
  }

  const playingNow = status === "playing" || status === "loading";

  return (
    <div className="radio" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <p className="radio-intro">{t("radio.intro")}</p>

      {current && (
        <section className="radio-now" aria-label={t("radio.nowPlaying")} data-status={status}>
          <span className={`radio-now-icon${status === "playing" ? " live" : ""}`} aria-hidden="true">
            <Icon name="radio" size={24} />
          </span>
          <div className="radio-now-text">
            <small>{t("radio.nowPlaying")}</small>
            <strong>{label(current).name}</strong>
            <span role="status">{statusText(t, status)}</span>
            <VolumeControl className="radio-now-volume" />
          </div>
          <button
            type="button"
            className="radio-now-toggle"
            aria-label={playingNow ? t("radio.pause") : t("radio.play", { name: label(current).name })}
            onClick={() => toggleRow(current)}
          >
            <Icon name={playingNow ? "pause" : "play"} size={24} filled />
          </button>
        </section>
      )}

      {last && (
        <button type="button" className="radio-continue" onClick={() => onPlay(last)}>
          <Icon name="play" size={20} filled />
          <span>{t("radio.continue", { name: label(last).name })}</span>
        </button>
      )}

      <input
        type="search"
        className="radio-search"
        placeholder={t("radio.search")}
        aria-label={t("radio.search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="radio-chips" role="group" aria-label={t("radio.kinds")}>
        {chips.map((chip) => (
          <button key={chip.id} type="button" className="radio-chip" aria-pressed={show === chip.id} onClick={() => setShow(chip.id)}>
            {chip.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="radio-empty">{show === "favorites" && !query ? t("radio.emptyFavorites") : t("radio.empty")}</p>
      ) : (
        <>
          <p className="radio-count">{visible.length === 1 ? t("radio.countOne") : t("radio.count", { count: visible.length })}</p>
          <ul className="radio-list">
            {visible.map((station) => {
              const { name, variant } = label(station);
              const isCurrent = station.id === currentId;
              const isFavorite = favoriteSet.has(station.id);
              const rowPlaying = isCurrent && (status === "playing" || status === "loading");
              return (
                <li key={station.id} className={isCurrent ? "radio-item current" : "radio-item"}>
                  <button
                    type="button"
                    className="radio-play"
                    aria-label={rowPlaying ? t("radio.pauseStation", { name }) : t("radio.play", { name })}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => toggleRow(station)}
                  >
                    <span className="radio-play-icon" aria-hidden="true">
                      <Icon name={rowPlaying ? "pause" : "play"} size={20} filled />
                    </span>
                    <span className="radio-play-text">
                      <span className="radio-play-name">{name}</span>
                      {variant && <span className="radio-play-variant">{variant}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="radio-star"
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? t("radio.unfavorite", { name }) : t("radio.favorite", { name })}
                    onClick={() => onToggleFavorite(station.id)}
                  >
                    <Icon name="star" size={20} filled={isFavorite} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export interface RadioMiniPlayerProps {
  station: RadioStation;
  status: RadioStatus;
  onToggle: () => void;
  onStop: () => void;
}

/**
 * The small bar that keeps the radio in reach while the person uses the rest of the app: the
 * station, what it is doing, play/pause, and a way to turn it off. The name takes you back to
 * the Radio page. It sits above the phone's tab bar, in the corner on a computer, and never takes focus.
 */
export function RadioMiniPlayer({ station, status, onToggle, onStop }: RadioMiniPlayerProps) {
  const { t, language } = useTranslation();
  const name = stationName(station, language);
  const playing = status === "playing" || status === "loading";
  return (
    <section className="radio-mini" role="region" aria-label={t("radio.nowPlaying")} dir={language === "ar" ? "rtl" : "ltr"} lang={language} data-status={status}>
      <span className={`radio-now-icon${status === "playing" ? " live" : ""}`} aria-hidden="true">
        <Icon name="radio" size={20} />
      </span>
      <a className="radio-mini-text" href="#/radio">
        <strong>{name}</strong>
        <span role="status">{statusText(t, status) || t("radio.status.paused")}</span>
      </a>
      <VolumeControl className="radio-mini-volume" />
      <button type="button" className="radio-mini-toggle" aria-label={playing ? t("radio.pause") : t("radio.play", { name })} onClick={onToggle}>
        <Icon name={playing ? "pause" : "play"} size={20} filled />
      </button>
      <button type="button" className="radio-mini-stop" aria-label={t("radio.stop")} onClick={onStop}>
        <Icon name="close" size={20} />
      </button>
    </section>
  );
}
