import { describe, expect, it } from "vitest";
import { RADIO_GROUPS } from "@manarah/core";
import { RADIO_STATIONS } from "./index.js";

describe("RADIO_STATIONS", () => {
  it("has the 172 stations that were checked live, each with a unique id", () => {
    expect(RADIO_STATIONS).toHaveLength(172);
    expect(new Set(RADIO_STATIONS.map((s) => s.id)).size).toBe(172);
  });

  it("starts with the Saudi Quran Radio", () => {
    expect(RADIO_STATIONS[0]).toMatchObject({ id: 109082, nameAr: "إذاعة القرآن الكريم - السعودية", group: "general" });
  });

  it("leaves out the five streams that did not answer when checked", () => {
    const ids = new Set(RADIO_STATIONS.map((s) => s.id));
    for (const dead of [94, 109057, 109067, 109076, 109084]) expect(ids.has(dead)).toBe(false);
  });

  it("has only secure streams from the two hosts that were checked", () => {
    for (const s of RADIO_STATIONS) {
      expect(s.url, s.nameEn).toMatch(/^https:\/\/(backup\.qurango\.net\/radio\/|stream\.radiojar\.com\/)[\w.-]+$/);
    }
  });

  it("names every station in both languages, with no leftover decoration from the source", () => {
    for (const s of RADIO_STATIONS) {
      expect(s.nameAr.trim(), String(s.id)).not.toBe("");
      expect(s.nameEn.trim(), String(s.id)).not.toBe("");
      for (const name of [s.nameAr, s.nameEn]) {
        expect(name, name).not.toMatch(/^[\s\-*]|[\s\-*]$|\*|\s{2,}/);
      }
      expect(s.nameEn, s.nameEn).not.toMatch(/^Radio /);
    }
  });

  it("tells apart stations that share a name: no two have the same name and reading, in either language", () => {
    const key = (name: string, variant?: string) => `${name}|${variant ?? ""}`;
    expect(new Set(RADIO_STATIONS.map((s) => key(s.nameAr, s.variant))).size).toBe(RADIO_STATIONS.length);
    expect(new Set(RADIO_STATIONS.map((s) => key(s.nameEn, s.variant))).size).toBe(RADIO_STATIONS.length);
  });

  it("puts every station in a known group, and every group has stations", () => {
    for (const s of RADIO_STATIONS) expect(RADIO_GROUPS).toContain(s.group);
    for (const g of RADIO_GROUPS) expect(RADIO_STATIONS.some((s) => s.group === g), g).toBe(true);
  });

  it("keeps the readings straight: Warsh and Qalon only where a reciter has more than one station", () => {
    const withVariant = RADIO_STATIONS.filter((s) => s.variant);
    expect(withVariant.map((s) => s.id).sort((a, b) => a - b)).toEqual([30, 31, 39, 40, 47, 70, 72, 73, 75, 76, 78, 83, 92, 96, 105]);
    // every reciter with a variant station also has its plain station, or other variants of its own
    const bySlot = new Map<string, number>();
    for (const s of RADIO_STATIONS.filter((s) => s.group === "reciter")) bySlot.set(s.nameEn, (bySlot.get(s.nameEn) ?? 0) + 1);
    for (const s of withVariant) expect(bySlot.get(s.nameEn), s.nameEn).toBeGreaterThan(1);
  });

  it("has the azkar stations the app's Azkar page is about", () => {
    expect(RADIO_STATIONS.filter((s) => s.group === "azkar").map((s) => s.nameAr)).toEqual(["الرقية الشرعية", "أذكار الصباح", "أذكار المساء"]);
  });
});
