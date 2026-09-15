import {
  runNotificationCheck,
  NOTIFICATION_STATE_KEY,
  SETTINGS_STORAGE_KEY,
  type DueNotification,
  type NotificationState,
  type UserSettings,
} from "@manarah/core";
import { AZKAR_CATEGORIES } from "@manarah/data";
import type { IndexedDbStore } from "@manarah/storage";

const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Fires a due notification through the service worker registration where
 * available — required on Android/Chrome, which throws on `new Notification()`
 * directly from a page — falling back to the plain constructor otherwise.
 */
async function notify(notification: DueNotification): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) {
    await registration.showNotification(notification.title, { body: notification.body });
  } else {
    new Notification(notification.title, { body: notification.body });
  }
}

/**
 * Starts the recurring on-device check for due prayer/azkar notifications,
 * reusing the same `runNotificationCheck` decision logic the extension
 * drives from `chrome.alarms`. There's no push server (zero-cost constraint),
 * so this ticks on a plain interval instead — it only fires while this tab
 * is open, same caveat as the badge/countdown already have. Returns a
 * disposer that stops the interval.
 */
export function startNotificationLoop(store: IndexedDbStore): () => void {
  async function tick(): Promise<void> {
    await runNotificationCheck({
      getSettings: () => store.get<UserSettings>(SETTINGS_STORAGE_KEY),
      getNotificationState: () => store.get<NotificationState>(NOTIFICATION_STATE_KEY),
      setNotificationState: (state) => store.set(NOTIFICATION_STATE_KEY, state),
      notify: (notification) => void notify(notification),
      azkarCategories: AZKAR_CATEGORIES,
    });
  }

  void tick();
  const intervalId = setInterval(() => void tick(), CHECK_INTERVAL_MS);
  return () => clearInterval(intervalId);
}
