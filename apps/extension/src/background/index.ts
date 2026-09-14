const PRAYER_CHECK_ALARM = "prayer-check";

chrome.runtime.onInstalled.addListener(() => {
  // Fires periodically to recompute the next prayer/azkar trigger and, if due,
  // fire a chrome.notifications alert. Real scheduling logic (reading settings
  // from chrome.storage.sync, computing via @manarah/core) lands with
  // the azkar-engine and prayer-times UI work.
  chrome.alarms.create(PRAYER_CHECK_ALARM, { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== PRAYER_CHECK_ALARM) return;
  // TODO: compute next prayer/azkar time and call chrome.notifications.create when due.
});
