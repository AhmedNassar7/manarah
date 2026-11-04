import { describe, expect, it } from "vitest";
import type { AzkarCategory } from "@manarah/core";
import { formatNotification } from "./notifications.js";

const morningEvening: AzkarCategory = {
  id: "27",
  name: "Words of remembrance for morning and evening",
  nameArabic: "أذكار الصباح والمساء",
  trigger: "morning-evening",
  items: [],
};
const waking: AzkarCategory = {
  id: "1",
  name: "Supplications for when you wake up",
  nameArabic: "أذكار الاستيقاظ من النوم",
  trigger: "waking",
  items: [],
};
const noArabicTitle: AzkarCategory = { id: "96", name: "Invocation for traveling", trigger: "situational", items: [] };

describe("formatNotification", () => {
  it("formats a prayer notification in English and Arabic", () => {
    expect(formatNotification({ type: "prayer", prayer: "maghrib" }, "en")).toEqual({
      title: "Maghrib prayer time",
      body: "It's time for Maghrib.",
    });
    expect(formatNotification({ type: "prayer", prayer: "fajr" }, "ar")).toEqual({
      title: "حان وقت صلاة الفجر",
      body: "حان الآن وقت صلاة الفجر.",
    });
  });

  it("names the prayer in the post-prayer azkar title", () => {
    const n = { type: "post-salah-azkar" as const, prayer: "asr" as const, categories: [morningEvening] };
    expect(formatNotification(n, "ar").title).toBe("أذكار بعد صلاة العصر");
    expect(formatNotification(n, "en").title).toBe("Azkar after Asr");
  });

  it("titles each reminder slot and lists its categories in the UI language", () => {
    const n = { type: "azkar-reminder" as const, slot: "fajr" as const, categories: [waking, morningEvening] };
    expect(formatNotification(n, "en")).toEqual({
      title: "Morning azkar",
      body: "Supplications for when you wake up, Words of remembrance for morning and evening",
    });
    expect(formatNotification(n, "ar")).toEqual({
      title: "أذكار الصباح",
      body: "أذكار الاستيقاظ من النوم، أذكار الصباح والمساء",
    });
    expect(formatNotification({ type: "azkar-reminder", slot: "asr", categories: [] }, "en").title).toBe(
      "Evening azkar"
    );
    expect(formatNotification({ type: "azkar-reminder", slot: "night", categories: [] }, "ar").title).toBe(
      "أذكار النوم"
    );
  });

  it("uses the category's own title for a custom-time reminder, falling back to English", () => {
    expect(formatNotification({ type: "custom-azkar", category: noArabicTitle, time: "14:30" }, "ar")).toEqual({
      title: "Invocation for traveling",
      body: "أذكارك المجدولة في 14:30",
    });
  });
});

describe("formatNotification — observances", () => {
  it("says it is tomorrow, and by the calculated calendar, in English and Arabic", () => {
    expect(formatNotification({ type: "observance", observance: "ashura", when: "tomorrow" }, "en")).toEqual({
      title: "Ashura — recommended fast",
      body: "Tomorrow, by the calculated calendar. Confirm with your local announcement.",
    });
    const ar = formatNotification({ type: "observance", observance: "ashura", when: "tomorrow" }, "ar");
    expect(ar.title).toBe("عاشوراء — صيام مستحب");
    expect(ar.body).toContain("غدًا");
  });

  it("wishes Eid Mubarak on the day itself, but only for the two Eids", () => {
    expect(formatNotification({ type: "observance", observance: "eid-al-fitr", when: "today" }, "en")).toEqual({
      title: "Eid al-Fitr",
      body: "Eid Mubarak! Taqabbal Allahu minna wa minkum.",
    });
    expect(formatNotification({ type: "observance", observance: "eid-al-adha", when: "today" }, "ar").body).toContain("عيد مبارك");
    expect(formatNotification({ type: "observance", observance: "ramadan-start", when: "today" }, "en").body).toBe(
      "Today, by the calculated calendar."
    );
  });

  it("has a title for every observance the engine can raise", () => {
    for (const id of ["islamic-new-year", "tasua", "ashura", "ramadan-start", "eid-al-fitr", "day-of-arafah", "eid-al-adha", "white-days"]) {
      for (const language of ["en", "ar"] as const) {
        const { title } = formatNotification({ type: "observance", observance: id, when: "tomorrow" }, language);
        expect(title, `${id}/${language}`).not.toMatch(/^hijri\.event\./);
      }
    }
  });
});

describe("formatNotification — Ramadan countdown", () => {
  it("says how many days away Ramadan is, and that it is calculated, in English and Arabic", () => {
    expect(formatNotification({ type: "ramadan-countdown", daysAway: 30 }, "en")).toEqual({
      title: "Ramadan is 30 days away",
      body: "Expected, by the calculated calendar. Confirm with your local announcement.",
    });
    expect(formatNotification({ type: "ramadan-countdown", daysAway: 7 }, "ar").title).toBe("بقي 7 يومًا على رمضان");
  });
});

