import { useEffect, useRef, useState } from "react";
import { AYAH_SEPARATOR, listProgress, parseAzkarText, splitAzkarTranslation, type AzkarCategory } from "@manarah/core";
import { azkarCategoryName, useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

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
  /** Today's tallies for this list when it opens (item id -> times said), so progress survives leaving the page. */
  initialCounts?: Record<string, number>;
  /** Called with the full tallies after every change, for saving. */
  onCountsChange?: (counts: Record<string, number>) => void;
}

/**
 * Renders one azkar category with a per-item tally counter. Arabic only by
 * default — the translation is opt-in (a toggle appears when the category
 * has one), the same Arabic-first rule as the Quran reader, so it doesn't
 * compete with the text being recited. A progress bar stays in view while you
 * go down the list — "Dhikr 4 of 23, 3 done" — the dhikr to say now is
 * marked, and finishing one moves you on to the next. Shared across
 * web/extension/desktop/mobile.
 */
export function AzkarList({
  category,
  showTranslation: showTranslationProp,
  onShowTranslationChange,
  onItemComplete,
  initialCounts,
  onCountsChange,
}: AzkarListProps) {
  const { t, language } = useTranslation();
  const [localShowTranslation, setLocalShowTranslation] = useState(false);
  const showTranslation = showTranslationProp ?? localShowTranslation;
  const hasTranslations = category.items.some((item) => item.translation);
  function setShowTranslation(show: boolean) {
    setLocalShowTranslation(show);
    onShowTranslationChange?.(show);
  }
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...(initialCounts ?? {}) }));
  // Tracks which button is mid-bounce so only the just-tapped one animates,
  // not every button in the list. Cleared via onAnimationEnd, not a timer,
  // so it can never desync from the actual CSS animation duration.
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  const progress = listProgress(category.items, counts);

  function scrollToItem(index: number) {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    itemRefs.current[index]?.scrollIntoView?.({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }

  function update(next: Record<string, number>) {
    setCounts(next);
    onCountsChange?.(next);
  }

  function tally(itemId: string, repeatCount: number) {
    const current = counts[itemId] ?? 0;
    setTappedId(itemId);
    if (current >= repeatCount) return;
    const next = { ...counts, [itemId]: current + 1 };
    update(next);
    if (current + 1 >= repeatCount) {
      // The completion is reported from the click, not from inside a state updater (which React may run twice).
      onItemComplete?.(itemId);
      // Let the completion bloom play, then bring the next dhikr into view — the thing you would otherwise have to scroll for.
      const after = listProgress(category.items, next);
      if (!after.allDone && after.currentIndex >= 0) {
        timers.current.push(window.setTimeout(() => scrollToItem(after.currentIndex), 450));
      }
    }
  }

  function reset() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      timers.current.push(window.setTimeout(() => setConfirmingReset(false), 3500));
      return;
    }
    setConfirmingReset(false);
    update({});
  }

  const showProgress = category.items.length > 1;
  const hasProgress = Object.keys(counts).length > 0;

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

      {showProgress && (
        <div className={progress.allDone ? "azkar-progress done" : "azkar-progress"} role="group" aria-label={t("azkarProgress.label")}>
          <div className="azkar-progress-text">
            {progress.allDone ? (
              <span className="azkar-progress-complete" role="status">
                <Icon name="check" size={16} /> {t("azkarProgress.allDone")}
              </span>
            ) : (
              <button type="button" className="azkar-progress-current" onClick={() => scrollToItem(progress.currentIndex)} aria-label={t("azkarProgress.goToCurrent")}>
                {t("azkarProgress.current", { n: progress.currentIndex + 1, total: progress.total })}
              </button>
            )}
            <span className="azkar-progress-done">{t("azkarProgress.done", { done: progress.completed })}</span>
            {hasProgress && (
              <button type="button" className={confirmingReset ? "azkar-progress-reset confirming" : "azkar-progress-reset"} onClick={reset}>
                {confirmingReset ? t("azkarProgress.resetConfirm") : t("azkarProgress.reset")}
              </button>
            )}
          </div>
          <div
            className="azkar-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.completed}
            aria-label={t("azkarProgress.label")}
          >
            <span style={{ transform: `scaleX(${progress.fraction})` }} />
          </div>
        </div>
      )}

      <ul>
        {category.items.map((item, index) => {
          const done = counts[item.id] ?? 0;
          // Reaching repeatCount is a one-time event by construction: `done`
          // only changes on tally() clicks and is clamped at repeatCount, so
          // this class is applied exactly once (the render where it first
          // reaches the target) and never re-triggers the bloom on
          // unrelated re-renders.
          const isCompleted = item.repeatCount > 0 && done === item.repeatCount;
          const isCurrent = showProgress && index === progress.currentIndex;
          const className = [isCompleted ? "completed" : "", isCurrent ? "current" : ""].filter(Boolean).join(" ") || undefined;

          return (
            <li
              key={item.id}
              className={className}
              aria-current={isCurrent ? "step" : undefined}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
            >
              {/* The stored text is one string with the source's printed-book markers; show its parts one by one. */}
              <div className="azkar-text">
                {parseAzkarText(item.arabic).map((part, partIndex) => (
                  <p key={partIndex} className={`azkar-part azkar-part-${part.kind}`} dir="rtl" lang="ar">
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
                  {splitAzkarTranslation(item.translation).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} dir="ltr" lang="en">
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
