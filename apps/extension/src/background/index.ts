import {
  computeBadgeState,
  computePrayerTimes,
  runNotificationCheck,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type NotificationState,
  type UserSettings,
} from "@manarah/core";
import { AZKAR_CATEGORIES } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";

const PRAYER_CHECK_ALARM = "prayer-check";
const NOTIFICATION_STATE_KEY = "manarah:notification-state";

const store = new ChromeSyncStore();

chrome.runtime.onInstalled.addListener(() => {
  // 1-minute period so the toolbar badge (minutes-to-next-prayer) stays
  // live. The notification check run alongside it is cheap local math (no
  // network calls), so there's no real cost to running it this often.
  chrome.alarms.create(PRAYER_CHECK_ALARM, { periodInMinutes: 1 });
  void tick();
});

chrome.runtime.onStartup.addListener(() => {
  void tick();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PRAYER_CHECK_ALARM) {
    void tick();
  }
});

async function tick(): Promise<void> {
  await Promise.all([updateBadge(), checkNotifications()]);
}

async function updateBadge(): Promise<void> {
  const settings = (await store.get<UserSettings>(SETTINGS_STORAGE_KEY)) ?? DEFAULT_SETTINGS;
  if (!settings.coordinates) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const times = computePrayerTimes(settings.coordinates, new Date(), settings.prayerTimesSettings);
  const badge = computeBadgeState(new Date(), times);
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

async function checkNotifications(): Promise<void> {
  await runNotificationCheck({
    getSettings: () => store.get<UserSettings>(SETTINGS_STORAGE_KEY),
    getNotificationState: () => store.get<NotificationState>(NOTIFICATION_STATE_KEY),
    setNotificationState: (state) => store.set(NOTIFICATION_STATE_KEY, state),
    notify: (notification) => {
      chrome.notifications.create(`${notification.type}-${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title: notification.title,
        message: notification.body,
      });
    },
    azkarCategories: AZKAR_CATEGORIES,
  });
}
