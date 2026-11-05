import { useState } from "react";
import { AYAH_SEPARATOR, parseAzkarText, splitAzkarTranslation, type AzkarCategory } from "@manarah/core";
import { azkarCategoryName, useTranslation } from "./i18n/index.js";

/** A verse's text with each verse-end ornament drawn in gold, like the brackets around it. */
function withAyahMarks(text: string) {
  return text.split(AYAH_SEPARATOR).flatMap((chunk, index) =>
    index === 0
      ? [chunk]
      : [
          <span key={`mark-${index}`} className="azkar-ayah-end" aria-hidden="true">
            {AYAH_SEPARATOR}
          </span>,
          chunk,
        ]
  );
}

export interface AzkarListProps {
  category: AzkarCategory;
  /** Whether the English translation is shown under each dhikr. When omitted the list keeps this itself — hidden by default, so the Arabic is what you read. */
  showTranslation?: boolean;
  onShowTranslationChange?: (show: boolean) => void;
  /** Called the moment an item's tally reaches its repeat count (once per completion). */
  onItemComplete?: (itemId: string) => void;
}

/**
 * Renders one azkar category with a per-item tally counter. Arabic only by
 * default — the translation is opt-in (a toggle appears when the category
 * has one), the same Arabic-first rule as the Quran reader, so it doesn't
 * compete with the text being recited. Shared across web/extension/desktop/mobile.
 */
export function AzkarList({ category, showTranslation: showTranslationProp, onShowTranslationChange, onItemComplete }: AzkarListProps) {
  const { t, language } = useTranslation();
  const [localShowTranslation, setLocalShowTranslation] = useState(false);
  const showTranslation = showTranslationProp ?? localShowTranslation;
  const hasTranslations = category.items.some((item) => item.translation);
  function setShowTranslation(show: boolean) {
    setLocalShowTranslation(show);
    onShowTranslationChange?.(show);
  }
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Tracks which button is mid-bounce so only the just-tapped one animates,
  // not every button in the list. Cleared via onAnimationEnd, not a timer,
  // so it can never desync from the actual CSS animation duration.
  const [tappedId, setTappedId] = useState<string | null>(null);

  function tally(itemId: string, repeatCount: number) {
    // The completion is reported from the click, not from inside the state updater (which React may run twice).
    if ((counts[itemId] ?? 0) < repeatCount && (counts[itemId] ?? 0) + 1 >= repeatCount) onItemComplete?.(itemId);
    setCounts((prev) => {
      const next = Math.min((prev[itemId] ?? 0) + 1, repeatCount);
      return { ...prev, [itemId]: next };
    });
    setTappedId(itemId);
  }

  return (
    <section className="azkar-list">
      <h2 lang={language === "ar" && category.nameArabic ? "ar" : "en"}>{azkarCategoryName(category, language)}</h2>
      {hasTranslations && (
        <button
          type="button"
          className="azkar-translation-toggle"
          aria-pressed={showTranslation}
          onClick={() => setShowTranslation(!showTranslation)}
        >
          {showTranslation ? t("quranReader.hideTranslation") : t("quranReader.showTranslation")}
        </button>
      )}
      <ul>
        {category.items.map((item) => {
          const done = counts[item.id] ?? 0;
          // Reaching repeatCount is a one-time event by construction: `done`
          // only changes on tally() clicks and is clamped at repeatCount, so
          // this class is applied exactly once (the render where it first
          // reaches the target) and never re-triggers the bloom on
          // unrelated re-renders.
          const isCompleted = item.repeatCount > 0 && done === item.repeatCount;

          return (
            <li key={item.id} className={isCompleted ? "completed" : undefined}>
              {/* The stored text is one string with the source's printed-book markers; show its parts one by one. */}
              <div className="azkar-text">
                {parseAzkarText(item.arabic).map((part, index) => (
                  <p key={index} className={`azkar-part azkar-part-${part.kind}`} dir="rtl" lang="ar">
                    {part.kind === "quran" ? (
                      <>
                        <span className="azkar-bracket" aria-hidden="true">
                          ﴿
                        </span>
                        {withAyahMarks(part.text)}
                        <span className="azkar-bracket" aria-hidden="true">
                          ﴾
                        </span>
                      </>
                    ) : (
                      part.text
                    )}
                  </p>
                ))}
              </div>
              {item.reference && (
                <p className="azkar-reference" dir="ltr">
                  {t("azkar.quranRef", { ref: item.reference })}
                </p>
              )}
              {showTranslation && item.translation && (
                <div className="azkar-translation">
                  {splitAzkarTranslation(item.translation).map((paragraph, index) => (
                    <p key={index} dir="ltr" lang="en">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
              <button
                type="button"
                // Numbers read left-to-right in every language: without this, an Arabic layout reorders "0 / 1" into "1 / 0".
                dir="ltr"
                className={tappedId === item.id ? "tapped" : undefined}
                onAnimationEnd={() => setTappedId((current) => (current === item.id ? null : current))}
                onClick={() => tally(item.id, item.repeatCount)}
              >
                {done} / {item.repeatCount}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
