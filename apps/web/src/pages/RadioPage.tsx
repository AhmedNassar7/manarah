import { rememberStation, stationName, toggleFavorite, type RadioState, type RadioStation } from "@manarah/core";
import { RADIO_STATIONS } from "@manarah/data";
import { RadioBrowser, useTranslation } from "@manarah/ui";
import { useRadioPlayer } from "../radio-player.js";

export interface RadioPageProps {
  state: RadioState;
  onChange: (state: RadioState) => void;
}

/** The Quran radio: stations to browse and keep, playing through the app-wide player (see radio-player.ts). */
export function RadioPage({ state, onChange }: RadioPageProps) {
  const { t, language } = useTranslation();
  const player = useRadioPlayer();

  function start(station: RadioStation) {
    onChange(rememberStation(state, station.id));
    void player.play(station, stationName(station, language));
  }

  return (
    <>
      <h2 className="section-title">{t("app.sectionRadio")}</h2>
      <RadioBrowser
        stations={RADIO_STATIONS}
        favorites={state.favorites}
        lastId={state.lastId}
        currentId={player.stationId}
        status={player.status}
        onPlay={start}
        onPause={player.pause}
        onResume={() => void player.resume()}
        onToggleFavorite={(id) => onChange(toggleFavorite(state, id))}
      />
    </>
  );
}
