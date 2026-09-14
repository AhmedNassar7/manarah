import { useState } from "react";
import type { AzkarCategory } from "@manarah/core";

export interface AzkarListProps {
  category: AzkarCategory;
}

/** Renders one azkar category with a per-item tally counter. Shared across web/extension/desktop/mobile. */
export function AzkarList({ category }: AzkarListProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  function tally(itemId: string, repeatCount: number) {
    setCounts((prev) => {
      const next = Math.min((prev[itemId] ?? 0) + 1, repeatCount);
      return { ...prev, [itemId]: next };
    });
  }

  return (
    <section>
      <h2>{category.name}</h2>
      <ul>
        {category.items.map((item) => {
          const done = counts[item.id] ?? 0;
          return (
            <li key={item.id}>
              <p dir="rtl" lang="ar">
                {item.arabic}
              </p>
              {item.translation && <p>{item.translation}</p>}
              <button type="button" onClick={() => tally(item.id, item.repeatCount)}>
                {done} / {item.repeatCount}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
