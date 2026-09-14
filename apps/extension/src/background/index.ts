import {
  computeDueNotifications,
  computePrayerTimes,
  DEFAULT_SETTINGS,
  initialNotificationState,
  localDateKey,
  SETTINGS_STORAGE_KEY,
  type NotificationState,
  type UserSettings,
} from "@manarah/core";
import { getAzkarCategoriesByTrigger } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";

const PRAYER_CHECK_ALARM = "prayer-check";
const NOTIFICATION_STATE_KEY = "manarah:notification-state";

const store = new ChromeSyncStore();
const morningAzkar = getAzkarCategoriesByTrigger("morning");
const postSalahAzkar = getAzkarCategoriesByTrigger("post-salah");

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(PRAYER_CHECK_ALARM, { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PRAYER_CHECK_ALARM) {
    void checkAndNotify();
  }
});

async function checkAndNotify(): Promise<void> {
  const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
  if (!settings.coordinates) return;

  const now = new Date();
  const times = computePrayerTimes(settings.coordinates, now, settings.prayerTimesSettings);
  const previousState =
    (await store.get<NotificationState>(NOTIFICATION_STATE_KEY)) ?? initialNotificationState(localDateKey(now));

  const { due, nextState } = computeDueNotifications(now, times, morningAzkar, postSalahAzkar, previousState);

  for (const notification of due) {
    chrome.notifications.create(`${notification.type}-${nextState.date}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: notification.title,
      message: notification.body,
    });
  }

  await store.set(NOTIFICATION_STATE_KEY, nextState);
}
