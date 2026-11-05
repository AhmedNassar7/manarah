import { useState } from "react";
import { listProgress, type AzkarCategory, type AzkarSection } from "@manarah/core";
import { AzkarList } from "./AzkarList.js";
import { azkarCategoryName, useTranslation } from "./i18n/index.js";
import { Icon, isIconName } from "./icons/Icon.js";

export interface AzkarBrowserProps {
  sections: AzkarSection[];
  categories: AzkarCategory[];
  /** Section open on first render; defaults to the first section. */
  initialSectionId?: string;
  /** Passed through to the opened category's AzkarList; see its props. */
  showTranslation?: boolean;
  onShowTranslationChange?: (show: boolean) => void;
  /** Passed through to the opened category's AzkarList. */
  onItemComplete?: (itemId: string) => void;
  /** Today's tallies for every list (category id -> item id -> times said). Opened lists start from theirs, and finished lists are ticked in the tabs. */
  todaysCounts?: Record<string, Record<string, number>>;
  /** A list's tallies changed (for saving). */
  onCountsChange?: (categoryId: string, counts: Record<string, number>) => void;
}

/** Arabic search should match with or without harakat — strip diacritics/tatweel and fold alef/ya/ta-marbuta variants. */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

/**
 * Hisn al-Muslim, browsable by theme: a row of section tabs (morning &
 * evening, sleep, prayer, travel, …), each opening its own list of
 * categories, plus a search across every category title in both languages.
 * A section holding a single category opens straight into its azkar.
 */
export function AzkarBrowser({
  sections,
  categories,
  initialSectionId,
  showTranslation,
  onShowTranslationChange,
  onItemComplete,
  todaysCounts,
  onCountsChange,
}: AzkarBrowserProps) {
  const { t, language } = useTranslation();
  const [sectionId, setSectionId] = useState(initialSectionId ?? sections[0]?.id);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const categoriesOf = (section: AzkarSection) =>
    section.categoryIds.map((id) => categoryById.get(id)).filter((c): c is AzkarCategory => !!c && c.items.length > 0);

  const isFinishedToday = (category: AzkarCategory) => listProgress(category.items, todaysCounts?.[category.id] ?? {}).allDone;
  const sectionFinished = (s: AzkarSection) => {
    const cats = categoriesOf(s);
    return cats.length > 0 && cats.every(isFinishedToday);
  };

  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const sectionCategories = section ? categoriesOf(section) : [];
  const normalizedQuery = normalizeForSearch(query);
  const searchResults = normalizedQuery
    ? sections.flatMap((s) =>
        categoriesOf(s)
          .filter((c) => normalizeForSearch(`${c.name} ${c.nameArabic ?? ""}`).includes(normalizedQuery))
          .map((category) => ({ category, section: s }))
      )
    : [];

  const openCategory =
    (openCategoryId && categoryById.get(openCategoryId)) ||
    (!normalizedQuery && sectionCategories.length === 1 ? sectionCategories[0] : null);
  const openCategorySection = openCategory ? sections.find((s) => s.categoryIds.includes(openCategory.id)) : undefined;

  function selectSection(id: string) {
    setSectionId(id);
    setOpenCategoryId(null);
    setQuery("");
  }

  function openFromSearch(category: AzkarCategory, inSection: AzkarSection) {
    setSectionId(inSection.id);
    setOpenCategoryId(category.id);
    setQuery("");
  }

  return (
    <div className="azkar-browser" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <input
        type="search"
        className="azkar-browser-search"
        placeholder={t("azkarBrowser.searchPlaceholder")}
        aria-label={t("azkarBrowser.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="azkar-browser-sections" role="tablist" aria-label={t("azkarBrowser.sections")}>
        {sections.map((s) => {
          const selected = !normalizedQuery && s.id === section?.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className="azkar-browser-section-tab"
              onClick={() => selectSection(s.id)}
            >
              <SectionIcon name={s.icon} />
              <span>{t(`azkarSection.${s.id}`)}</span>
              {sectionFinished(s) && (
                <span className="azkar-browser-tab-done" title={t("azkarProgress.completedToday")}>
                  <Icon name="check" size={16} />
                  <span className="sr-only">{t("azkarProgress.completedToday")}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {normalizedQuery ? (
        <div className="azkar-browser-results">
          {searchResults.length === 0 ? (
            <p className="azkar-browser-empty">{t("azkarBrowser.noResults")}</p>
          ) : (
            <ul className="azkar-browser-categories">
              {searchResults.map(({ category, section: inSection }) => (
                <li key={category.id}>
                  <button type="button" onClick={() => openFromSearch(category, inSection)}>
                    <span className="azkar-browser-category-name">{azkarCategoryName(category, language)}</span>
                    <span className="azkar-browser-category-meta">
                      <SectionIcon name={inSection.icon} /> {t(`azkarSection.${inSection.id}`)} ·{" "}
                      {t("azkarBrowser.itemCount", { count: category.items.length })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : openCategory ? (
        <div className="azkar-browser-category" role="tabpanel">
          {sectionCategories.length > 1 && openCategorySection && (
            <button type="button" className="azkar-browser-back" onClick={() => setOpenCategoryId(null)}>
              <Icon name="arrow-left" size={16} />{" "}
              {t("azkarBrowser.backTo", { section: t(`azkarSection.${openCategorySection.id}`) })}
            </button>
          )}
          {/* Keyed so tally counts reset when switching to a different category. */}
          <AzkarList
            key={openCategory.id}
            category={openCategory}
            showTranslation={showTranslation}
            onShowTranslationChange={onShowTranslationChange}
            onItemComplete={onItemComplete}
            initialCounts={todaysCounts?.[openCategory.id]}
            onCountsChange={onCountsChange ? (counts) => onCountsChange(openCategory.id, counts) : undefined}
          />
        </div>
      ) : (
        section && (
          <div role="tabpanel">
            <ul className="azkar-browser-categories">
              {sectionCategories.map((category) => (
                <li key={category.id}>
                  <button type="button" onClick={() => setOpenCategoryId(category.id)}>
                    <span className="azkar-browser-category-name">
                      {azkarCategoryName(category, language)}
                      {isFinishedToday(category) && <Icon name="check" size={16} />}
                    </span>
                    <span className="azkar-browser-category-meta">
                      {t("azkarBrowser.itemCount", { count: category.items.length })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}

/** A section's icon, by name; an unknown name draws nothing rather than a broken glyph. */
function SectionIcon({ name }: { name: string }) {
  return isIconName(name) ? <Icon name={name} size={16} /> : null;
}
