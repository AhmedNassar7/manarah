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
