import { useEffect, useState } from "react";
import type { QuranWord } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface WordByWordPanelProps {
  surah: number;
  ayah: number;
  /** Injected so the component stays platform-agnostic and testable; the app supplies a fetch + cache. */
  load: (surah: number, ayah: number) => Promise<QuranWord[]>;
  onClose: () => void;
}

type LoadState = { status: "loading" } | { status: "error" } | { status: "loaded"; words: QuranWord[] };

/** One verse broken into its words, each with transliteration and meaning, laid out right-to-left like the verse itself. */
export function WordByWordPanel({ surah, ayah, load, onClose }: WordByWordPanelProps) {
  const { t, language } = useTranslation();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    load(surah, ayah).then(
      (words) => {
        if (!cancelled) setState({ status: "loaded", words });
      },
      () => {
        if (!cancelled) setState({ status: "error" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [surah, ayah, load, attempt]);

  return (
    <section
      className="word-by-word-panel"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      aria-label={t("wordByWord.title", { ayah })}
    >
      <div className="word-by-word-header">
        <span>{t("wordByWord.title", { ayah })}</span>
        <button type="button" className="word-by-word-close" aria-label={t("wordByWord.close")} onClick={onClose}>
          ×
        </button>
      </div>

      {state.status === "loading" && (
        <p className="word-by-word-status" role="status">
          {t("wordByWord.loading")}
        </p>
      )}
      {state.status === "error" && (
        <div className="word-by-word-status" role="alert">
          <p>{t("wordByWord.error")}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {t("wordByWord.retry")}
          </button>
        </div>
      )}
      {state.status === "loaded" && (
        <>
          <ol className="word-by-word-list" dir="rtl">
            {state.words.map((word) => (
              <li key={word.position}>
                <span className="word-by-word-arabic" lang="ar">
                  {word.text}
                </span>
                {word.transliteration && (
                  <span className="word-by-word-translit" dir="ltr" lang="en">
                    {word.transliteration}
                  </span>
                )}
                {word.translation && (
                  <span className="word-by-word-meaning" dir="ltr" lang="en">
                    {word.translation}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="word-by-word-source">{t("wordByWord.source")}</p>
        </>
      )}
    </section>
  );
}
