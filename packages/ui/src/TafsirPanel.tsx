import { useEffect, useState } from "react";
import type { TafsirEdition, TafsirEntry } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

/** Everything QuranReader needs to offer tafsir — grouped so the reader takes one optional prop instead of four. */
export interface TafsirSource {
  editions: TafsirEdition[];
  /** Already resolved to an existing edition (see resolveTafsirEdition). */
  editionId: string;
  onEditionChange: (id: string) => void;
  /** Injected so the component stays platform-agnostic and testable; the app supplies a fetch + cache. */
  load: (edition: TafsirEdition, surah: number, ayah: number) => Promise<TafsirEntry>;
}

export interface TafsirPanelProps {
  source: TafsirSource;
  surah: number;
  ayah: number;
  onClose: () => void;
}

type LoadState = { status: "loading" } | { status: "error" } | { status: "loaded"; entry: TafsirEntry };

/** Inline tafsir for one verse, with a source picker. Text arrives pre-flattened to plain blocks — never injected as HTML. */
export function TafsirPanel({ source, surah, ayah, onClose }: TafsirPanelProps) {
  const { t, language } = useTranslation();
  const edition = source.editions.find((e) => e.id === source.editionId) ?? source.editions[0];
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { load } = source;

  useEffect(() => {
    if (!edition) return;
    let cancelled = false;
    setState({ status: "loading" });
    load(edition, surah, ayah).then(
      (entry) => {
        if (!cancelled) setState({ status: "loaded", entry });
      },
      () => {
        if (!cancelled) setState({ status: "error" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [edition, surah, ayah, load, attempt]);

  if (!edition) return null;
  const uiDir = language === "ar" ? "rtl" : "ltr";
  const textDir = edition.language === "ar" ? "rtl" : "ltr";

  return (
    <section className="tafsir-panel" dir={uiDir} lang={language} aria-label={t("tafsir.title", { ayah })}>
      <div className="tafsir-panel-header">
        <label>
          <span>{t("tafsir.edition")}</span>
          <select value={edition.id} onChange={(e) => source.onEditionChange(e.target.value)}>
            {source.editions.map((e) => (
              <option key={e.id} value={e.id}>
                {t(`tafsir.edition.${e.id}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="tafsir-panel-close" aria-label={t("tafsir.close")} onClick={onClose}>
          ×
        </button>
      </div>

      {state.status === "loading" && (
        <p className="tafsir-panel-status" role="status">
          {t("tafsir.loading")}
        </p>
      )}
      {state.status === "error" && (
        <div className="tafsir-panel-status" role="alert">
          <p>{t("tafsir.error")}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {t("tafsir.retry")}
          </button>
        </div>
      )}
      {state.status === "loaded" && (
        <>
          {state.entry.verseKeys.length > 1 && (
            <p className="tafsir-panel-covers">
              {t("tafsir.covers", {
                range: `${state.entry.verseKeys[0]}–${state.entry.verseKeys[state.entry.verseKeys.length - 1]}`,
              })}
            </p>
          )}
          {state.entry.blocks.length === 0 ? (
            <p className="tafsir-panel-status">{t("tafsir.empty")}</p>
          ) : (
            <div className="tafsir-panel-text" dir={textDir} lang={edition.language}>
              {state.entry.blocks.map((block, i) =>
                block.kind === "heading" ? <h4 key={i}>{block.text}</h4> : <p key={i}>{block.text}</p>
              )}
            </div>
          )}
          <p className="tafsir-panel-source">{t("tafsir.source")}</p>
        </>
      )}
    </section>
  );
}
