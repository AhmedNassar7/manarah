import { useState } from "react";
import type { AzkarCategory, AzkarSection } from "@manarah/core";
import { AzkarList, azkarCategoryName } from "./AzkarList.js";
import { useTranslation } from "./i18n/index.js";

export interface AzkarBrowserProps {
  sections: AzkarSection[];
  categories: AzkarCategory[];
  /** Section open on first render; defaults to the first section. */
  initialSectionId?: string;
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
export function AzkarBrowser({ sections, categories, initialSectionId }: AzkarBrowserProps) {
  const { t, language } = useTranslation();
  const [sectionId, setSectionId] = useState(initialSectionId ?? sections[0]?.id);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const categoriesOf = (section: AzkarSection) =>
    section.categoryIds.map((id) => categoryById.get(id)).filter((c): c is AzkarCategory => !!c && c.items.length > 0);

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
              <span aria-hidden="true">{s.icon}</span>
              <span>{t(`azkarSection.${s.id}`)}</span>
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
                      {inSection.icon} {t(`azkarSection.${inSection.id}`)} ·{" "}
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
              {language === "ar" ? "→" : "←"}{" "}
              {t("azkarBrowser.backTo", { section: t(`azkarSection.${openCategorySection.id}`) })}
            </button>
          )}
          {/* Keyed so tally counts reset when switching to a different category. */}
          <AzkarList key={openCategory.id} category={openCategory} />
        </div>
      ) : (
        section && (
          <div role="tabpanel">
            <ul className="azkar-browser-categories">
              {sectionCategories.map((category) => (
                <li key={category.id}>
                  <button type="button" onClick={() => setOpenCategoryId(category.id)}>
                    <span className="azkar-browser-category-name">{azkarCategoryName(category, language)}</span>
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
