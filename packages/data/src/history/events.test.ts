import { describe, expect, it } from "vitest";
import { gregorianToHijri } from "@manarah/core";
import { HISTORICAL_EVENTS } from "./events.js";

describe("historical events", () => {
  it("has a reasonable set with unique ids", () => {
    expect(HISTORICAL_EVENTS.length).toBeGreaterThanOrEqual(12);
    const ids = HISTORICAL_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pins every event to at least one calendar, with a valid date", () => {
    for (const e of HISTORICAL_EVENTS) {
      expect(e.hijri !== undefined || e.gregorian !== undefined, e.id).toBe(true);
      if (e.hijri) {
        expect(e.hijri.month, e.id).toBeGreaterThanOrEqual(1);
        expect(e.hijri.month, e.id).toBeLessThanOrEqual(12);
        expect(e.hijri.day, e.id).toBeGreaterThanOrEqual(1);
        expect(e.hijri.day, e.id).toBeLessThanOrEqual(30);
      }
      if (e.gregorian) {
        const d = new Date(Date.UTC(e.gregorian.year, e.gregorian.month - 1, e.gregorian.day));
        expect([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()], e.id).toEqual([e.gregorian.year, e.gregorian.month, e.gregorian.day]);
      }
    }
  });

  it("is written in English and Arabic, for both title and note", () => {
    for (const e of HISTORICAL_EVENTS) {
      for (const text of [e.title.en, e.title.ar, e.note.en, e.note.ar]) expect(text.trim().length, e.id).toBeGreaterThan(8);
      expect(e.title.ar, e.id).toMatch(/[؀-ۿ]/);
    }
  });

  it("says plainly which dates are only the traditional ones, and gives established events their year (except the recurring Day of Ashura)", () => {
    for (const e of HISTORICAL_EVENTS) {
      expect(["established", "traditional"], e.id).toContain(e.confidence);
      if (e.confidence === "established" && e.id !== "ashura") expect(e.hijri?.year ?? e.gregorian?.year, e.id).toBeDefined();
    }
    const traditional = HISTORICAL_EVENTS.filter((e) => e.confidence === "traditional");
    expect(traditional.length).toBeGreaterThan(3);
    // The title or the note of a traditional date must hedge — "commonly", "traditional", "reported" or "differ".
    for (const e of traditional) expect(`${e.title.en} ${e.note.en}`, e.id).toMatch(/tradition|commonly|reported|differ/i);
  });

  it("never pins a pre-1582 event to a Gregorian date — Western sources date those in the Julian calendar, 6-9 days off", () => {
    for (const e of HISTORICAL_EVENTS) {
      if (e.gregorian) expect(e.gregorian.year, e.id).toBeGreaterThanOrEqual(1582);
    }
  });

  it("keeps the Julian-vs-Gregorian trap visible: the famous dates really are a week off when read as Gregorian", () => {
    // Saladin took Jerusalem on 27 Rajab 583 AH, which Western sources call 2 October 1187 (Julian).
    const asGregorian = gregorianToHijri(new Date(Date.UTC(1187, 9, 2)));
    expect(asGregorian.month).toBe(7);
    expect(27 - asGregorian.day).toBeGreaterThanOrEqual(6);
    // ...while the proleptic-Gregorian date of the same day is 6 days later: 8 October 1187.
    const corrected = gregorianToHijri(new Date(Date.UTC(1187, 9, 8)));
    expect(Math.abs(corrected.day - 27)).toBeLessThanOrEqual(1);
  });
});
