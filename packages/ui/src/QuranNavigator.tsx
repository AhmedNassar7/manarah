import { useState } from "react";
import type { Surah, VerseRef } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

type NavigatorTab = "surah" | "ayah" | "juz" | "page";

const TABS: NavigatorTab[] = ["surah", "ayah", "juz", "page"];

export interface QuranNavigatorProps {
  surahs: Surah[];
  currentSurahNumber: number;
  currentSurahVerseCount: number;
  onNavigate: (ref: VerseRef) => void;
  /** Resolves the first verse of a given juz' (1-30) — may load its backing data lazily. */
  resolveJuzStart: (juz: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
  /** Resolves the first verse of a given mushaf page (1-604) — may load its backing data lazily. */
  resolvePageStart: (page: number) => VerseRef | undefined | Promise<VerseRef | undefined>;
  juzCount: number;
  pageCount: number;
}

/**
 * The single entry point into every way of locating a place in the Quran:
 * by surah, by ayah number within the current surah, by juz', or by mushaf
 * page. Opens as a searchable tabbed panel — mirrors Quran.com's navigator,
 * which is the reference UX for this (a plain surah-only list, what this
 * replaced, covers only one of four ways readers actually think about
 * "where am I").
 */
export function QuranNavigator({
  surahs,
  currentSurahNumber,
  currentSurahVerseCount,
  onNavigate,
  resolveJuzStart,
  resolvePageStart,
  juzCount,
  pageCount,
}: QuranNavigatorProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NavigatorTab>("surah");
  const [query, setQuery] = useState("");

  const currentSurah = surahs.find((s) => s.number === currentSurahNumber);

  function close() {
    setOpen(false);
    setQuery("");
    setTab("surah");
  }

  if (!open) {
    return (
      <button
        type="button"
        className="quran-navigator-trigger"
        aria-haspopup="dialog"
        aria-label={t("quranNavigator.open")}
        onClick={() => setOpen(true)}
      >
        {currentSurah ? (
          <span dir="rtl" lang="ar">
            {currentSurah.number}. {currentSurah.nameArabic}
          </span>
        ) : (
          <span>{t("quranNavigator.open")}</span>
        )}
        <span aria-hidden="true">⌄</span>
      </button>
    );
  }

  const trimmed = query.trim();
  const filteredSurahs = !trimmed
    ? surahs
    : surahs.filter(
        (s) =>
          s.nameArabic.includes(trimmed) ||
          s.nameTransliterated.toLowerCase().includes(trimmed.toLowerCase()) ||
          String(s.number) === trimmed
      );
  const ayahNumbers = numberRange(currentSurahVerseCount).filter((n) => !trimmed || String(n).includes(trimmed));
  const juzNumbers = numberRange(juzCount).filter((n) => !trimmed || String(n).includes(trimmed));
  const pageNumbers = numberRange(pageCount).filter((n) => !trimmed || String(n).includes(trimmed));

  function handleSurahSelect(surahNumber: number) {
    onNavigate({ surah: surahNumber, ayah: 1 });
    close();
  }

  function handleAyahSelect(ayah: number) {
    onNavigate({ surah: currentSurahNumber, ayah });
    close();
  }

  async function handleJuzSelect(juz: number) {
    const ref = await resolveJuzStart(juz);
    if (ref) {
      onNavigate(ref);
      close();
    }
  }

  async function handlePageSelect(page: number) {
    const ref = await resolvePageStart(page);
    if (ref) {
      onNavigate(ref);
      close();
    }
  }

  const isEmpty =
    (tab === "surah" && filteredSurahs.length === 0) ||
    (tab === "ayah" && ayahNumbers.length === 0) ||
    (tab === "juz" && juzNumbers.length === 0) ||
    (tab === "page" && pageNumbers.length === 0);

  return (
    <div className="quran-navigator-panel" role="dialog" aria-label={t("quranNavigator.open")}>
      <div className="quran-navigator-header">
        <div className="quran-navigator-tabs" role="tablist">
          {TABS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={tab === tabId}
              className={tab === tabId ? "active" : undefined}
              onClick={() => {
                setTab(tabId);
                setQuery("");
              }}
            >
              {t(`quranNavigator.tab.${tabId}`)}
            </button>
          ))}
        </div>
        <button type="button" className="quran-navigator-close" aria-label={t("quranNavigator.close")} onClick={close}>
          ×
        </button>
      </div>

      <input
        type="text"
        role="searchbox"
        className="quran-navigator-search"
        placeholder={t(`quranNavigator.searchPlaceholder.${tab}`)}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        dir={tab === "surah" && language === "ar" ? "rtl" : "ltr"}
      />

      <ul className="quran-navigator-list">
        {tab === "surah" &&
          filteredSurahs.map((s) => (
            <li key={s.number}>
              <button type="button" aria-current={s.number === currentSurahNumber ? "true" : undefined} onClick={() => handleSurahSelect(s.number)}>
                <span className="quran-navigator-number">{s.number}</span>
                <span dir="rtl" lang="ar">
                  {s.nameArabic}
                </span>
                <span className="quran-navigator-translit">{s.nameTransliterated}</span>
              </button>
            </li>
          ))}

        {tab === "ayah" &&
          ayahNumbers.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => handleAyahSelect(n)}>
                {n}
              </button>
            </li>
          ))}

        {tab === "juz" &&
          juzNumbers.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => void handleJuzSelect(n)}>
                {t("quranNavigator.juzLabel", { n })}
              </button>
            </li>
          ))}

        {tab === "page" &&
          pageNumbers.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => void handlePageSelect(n)}>
                {t("quranNavigator.pageLabel", { n })}
              </button>
            </li>
          ))}

        {isEmpty && <li className="quran-navigator-empty">{t("quranNavigator.noResults")}</li>}
      </ul>
    </div>
  );
}

function numberRange(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}
