import type { DueNotification, Language, PrayerName } from "@manarah/core";
import { azkarCategoryName, translate } from "./translations.js";

export interface NotificationText {
  title: string;
  body: string;
}

/** "fajr" → the dictionary's "prayer.name.Fajr" key, shared with the prayer-times UI. */
function prayerName(prayer: PrayerName, language: Language): string {
  return translate(language, `prayer.name.${prayer[0].toUpperCase()}${prayer.slice(1)}`);
}

/**
 * Renders core's language-neutral DueNotification into title/body text in
 * the user's language. Deliberately free of React so the extension's
 * background service worker can import it (via "@manarah/ui/notifications")
 * without bundling the component library.
 */
export function formatNotification(notification: DueNotification, language: Language): NotificationText {
  const t = (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);
  const categoryList = (categories: Parameters<typeof azkarCategoryName>[0][]) =>
    categories.map((c) => azkarCategoryName(c, language)).join(language === "ar" ? "، " : ", ");

  switch (notification.type) {
    case "prayer": {
      const prayer = prayerName(notification.prayer, language);
      return { title: t("notification.prayerTitle", { prayer }), body: t("notification.prayerBody", { prayer }) };
    }
    case "post-salah-azkar":
      return {
        title: t("notification.postSalahTitle", { prayer: prayerName(notification.prayer, language) }),
        body: categoryList(notification.categories),
      };
    case "azkar-reminder":
      return { title: t(`notification.slot.${notification.slot}`), body: categoryList(notification.categories) };
    case "custom-azkar":
      return {
        title: azkarCategoryName(notification.category, language),
        body: t("notification.customBody", { time: notification.time }),
      };
  }
}
