import type { EventResult } from "@manarah/core";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The words for an event's result — a warm, short message in the user's
 * language, rotating between a few wordings so it doesn't repeat itself.
 * Returns undefined when there's nothing to say (e.g. a repeated tap).
 */
export function encouragementText(result: EventResult, t: Translate): string | undefined {
  switch (result.encouragement) {
    case "none":
      return undefined;
    case "streak":
      return t(`progress.msg.streak.${result.variant}`, { count: result.streak ?? 0 });
    case "badge": {
      const badge = result.newBadges[0];
      return t(`progress.msg.badge.${result.variant}`, { badge: badge ? t(`badge.${badge}`) : "" });
    }
    default:
      return t(`progress.msg.${result.encouragement}.${result.variant}`);
  }
}
