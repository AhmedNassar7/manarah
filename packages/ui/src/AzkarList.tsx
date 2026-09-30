import { useState } from "react";
import type { AzkarCategory, Language } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";

export interface AzkarListProps {
  category: AzkarCategory;
}

/** The category title in the UI language — Hisn al-Muslim's own Arabic title when there is one, else the English name. */
export function azkarCategoryName(category: AzkarCategory, language: Language): string {
  return language === "ar" && category.nameArabic ? category.nameArabic : category.name;
}

/** Renders one azkar category with a per-item tally counter. Shared across web/extension/desktop/mobile. */
export function AzkarList({ category }: AzkarListProps) {
  const { language } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Tracks which button is mid-bounce so only the just-tapped one animates,
  // not every button in the list. Cleared via onAnimationEnd, not a timer,
  // so it can never desync from the actual CSS animation duration.
  const [tappedId, setTappedId] = useState<string | null>(null);

  function tally(itemId: string, repeatCount: number) {
    setCounts((prev) => {
      const next = Math.min((prev[itemId] ?? 0) + 1, repeatCount);
      return { ...prev, [itemId]: next };
    });
    setTappedId(itemId);
  }

  return (
    <section className="azkar-list">
      <h2 lang={language === "ar" && category.nameArabic ? "ar" : "en"}>{azkarCategoryName(category, language)}</h2>
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
              <p dir="rtl" lang="ar">
                {item.arabic}
              </p>
              {item.translation && (
                <p dir="ltr" lang="en">
                  {item.translation}
                </p>
              )}
              <button
                type="button"
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
