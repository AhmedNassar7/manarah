import { describe, expect, it } from "vitest";
import { emptyRadio, filterStations, normalizeRadio, pruneRadio, rememberStation, stationName, toggleFavorite, type RadioStation } from "./index.js";

const st = (id: number, nameAr: string, nameEn: string, group: RadioStation["group"] = "reciter"): RadioStation => ({ id, nameAr, nameEn, url: `https://x/${id}`, group });
const stations = [
  st(1, "إذاعة القرآن الكريم - السعودية", "Holy Quran Radio (Saudi Arabia)", "general"),
  st(2, "تلاوات خاشعة", "Humble recitations", "general"),
  st(10, "مشاري العفاسي", "Mishary Alafasi"),
  st(11, "ماهر المعيقلي", "Maher Al Meaqli"),
  st(12, "أحمد العجمي", "Ahmad Al-Ajmy"),
  st(20, "تفسير القرآن الكريم", "Quran Tafseer", "knowledge"),
  st(30, "أذكار الصباح", "Morning remembrance", "azkar"),
  st(40, "ترجمة معاني القرآن باللغة الفرنسية", "Quran translation into French", "translation"),
];
const f = { query: "", show: "all" as const, favorites: [] as number[], language: "en" };

describe("favourites and last station", () => {
  it("adds new favourites first and removes on a second toggle", () => {
    let s = toggleFavorite(emptyRadio(), 10);
    s = toggleFavorite(s, 11);
    expect(s.favorites).toEqual([11, 10]);
    expect(toggleFavorite(s, 11).favorites).toEqual([10]);
  });

  it("remembers the last station", () => {
    expect(rememberStation(emptyRadio(), 12).lastId).toBe(12);
  });

  it("repairs bad saved state", () => {
    expect(normalizeRadio(null)).toEqual({ favorites: [] });
    expect(normalizeRadio({ favorites: [3, 3, "x", -1, 2.5, 4], lastId: "no" })).toEqual({ favorites: [3, 4] });
    expect(normalizeRadio({ favorites: [], lastId: 7 })).toEqual({ favorites: [], lastId: 7 });
  });

  it("drops stations the catalogue no longer has", () => {
    expect(pruneRadio({ favorites: [10, 999], lastId: 999 }, stations)).toEqual({ favorites: [10] });
  });
});

describe("filterStations", () => {
  it("lists everything: general in catalogue order (Saudi radio first), then the rest alphabetically", () => {
    const names = filterStations(stations, f).map((s) => s.nameEn);
    expect(names.slice(0, 2)).toEqual(["Holy Quran Radio (Saudi Arabia)", "Humble recitations"]);
    expect(names.slice(2, 5)).toEqual(["Ahmad Al-Ajmy", "Maher Al Meaqli", "Mishary Alafasi"]);
  });

  it("narrows to one group", () => {
    expect(filterStations(stations, { ...f, show: "azkar" }).map((s) => s.id)).toEqual([30]);
  });

  it("searches English names, ignoring case", () => {
    expect(filterStations(stations, { ...f, query: "  MAHER " }).map((s) => s.id)).toEqual([11]);
  });

  it("searches Arabic however the letters are spelled", () => {
    expect(filterStations(stations, { ...f, language: "ar", query: "احمد العجمي" }).map((s) => s.id)).toEqual([12]);
    expect(filterStations(stations, { ...f, language: "ar", query: "اذكار الصباح" }).map((s) => s.id)).toEqual([30]);
    expect(filterStations(stations, { ...f, language: "ar", query: "القران" }).map((s) => s.id)).toEqual([1, 20, 40]);
  });

  it("matches either language's name whichever the app is in", () => {
    expect(filterStations(stations, { ...f, language: "ar", query: "mishary" }).map((s) => s.id)).toEqual([10]);
  });

  it("favourites are listed in the order they were added, skipping retired ones, and still searchable", () => {
    const base = { ...f, show: "favorites" as const, favorites: [12, 999, 10] };
    expect(filterStations(stations, base).map((s) => s.id)).toEqual([12, 10]);
    expect(filterStations(stations, { ...base, query: "misha" }).map((s) => s.id)).toEqual([10]);
  });

  it("sorts Arabic names in Arabic order", () => {
    const names = filterStations(stations, { ...f, language: "ar", show: "reciter" }).map((s) => stationName(s, "ar"));
    expect(names).toEqual([...names].sort(new Intl.Collator("ar").compare));
  });
});
