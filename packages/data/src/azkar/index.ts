import type { AzkarCategory } from "@manarah/core";
import categoriesData from "./categories.json";

/**
 * Default Hisn al-Muslim azkar set (132 categories, 267 items), sourced from
 * wafaaelmaandy/Hisn-Muslim-Json on GitHub — itself built from hisnmuslim.com's
 * text and per-dua audio. Content spot-checked against known texts (Ayat
 * al-Kursi, Sayyid al-Istighfar, etc.) at fetch time, 2026-09-15.
 *
 * `trigger` on each category is a heuristic default based on its title
 * (morning/evening, waking, before-sleep, post-salah, or "situational" for
 * everything else — contextual duas with no fixed daily time). Users can
 * remap any category's trigger via AzkarSchedule; this is only the default.
 */
export const AZKAR_CATEGORIES: AzkarCategory[] = categoriesData as AzkarCategory[];

export function getAzkarCategory(id: string): AzkarCategory | undefined {
  return AZKAR_CATEGORIES.find((c) => c.id === id);
}

export function getAzkarCategoriesByTrigger(
  trigger: AzkarCategory["trigger"]
): AzkarCategory[] {
  return AZKAR_CATEGORIES.filter((c) => c.trigger === trigger);
}
