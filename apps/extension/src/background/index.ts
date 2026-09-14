import { runNotificationCheck, SETTINGS_STORAGE_KEY, type NotificationState, type UserSettings } from "@manarah/core";
import { AZKAR_CATEGORIES } from "@manarah/data";
import { ChromeSyncStore } from "@manarah/storage";

const PRAYER_CHECK_ALARM = "prayer-check";
const NOTIFICATION_STATE_KEY = "manarah:notification-state";

const store = new ChromeSyncStore();

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(PRAYER_CHECK_ALARM, { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PRAYER_CHECK_ALARM) {
    void runNotificationCheck({
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
});
