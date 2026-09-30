import { describe, expect, it } from "vitest";
import {
  formatVerseForSharing,
  getAnnotation,
  listAnnotations,
  setNote,
  toggleBookmark,
  verseKey,
  type VerseAnnotations,
} from "./index.js";

const now = new Date("2026-09-30T12:00:00Z");
const later = new Date("2026-09-30T13:00:00Z");

describe("verseKey", () => {
  it("formats as surah:ayah", () => {
    expect(verseKey(2, 255)).toBe("2:255");
  });
});

describe("toggleBookmark", () => {
  it("bookmarks an unannotated verse", () => {
    const next = toggleBookmark({}, 2, 255, now);
    expect(getAnnotation(next, 2, 255)).toEqual({
      surah: 2,
      ayah: 255,
      bookmarked: true,
      note: undefined,
      updatedAt: now.toISOString(),
    });
  });

  it("removes the entry entirely when un-bookmarking a verse with no note", () => {
    const bookmarked = toggleBookmark({}, 2, 255, now);
    const next = toggleBookmark(bookmarked, 2, 255, later);
    expect(next).toEqual({});
  });

  it("keeps the note when un-bookmarking a verse that has one", () => {
    let annotations = setNote({}, 1, 1, "Opening", now);
    annotations = toggleBookmark(annotations, 1, 1, now);
    annotations = toggleBookmark(annotations, 1, 1, later);
    expect(getAnnotation(annotations, 1, 1)).toMatchObject({ bookmarked: false, note: "Opening" });
  });

  it("does not mutate its input", () => {
    const input: VerseAnnotations = {};
    toggleBookmark(input, 1, 1, now);
    expect(input).toEqual({});
  });
});

describe("setNote", () => {
  it("stores a trimmed note and updates the timestamp", () => {
    const next = setNote({}, 18, 10, "  Cave dua  ", now);
    expect(getAnnotation(next, 18, 10)).toMatchObject({
      note: "Cave dua",
      bookmarked: false,
      updatedAt: now.toISOString(),
    });
  });

  it("keeps an existing bookmark when adding a note", () => {
    const bookmarked = toggleBookmark({}, 18, 10, now);
    const next = setNote(bookmarked, 18, 10, "Cave dua", later);
    expect(getAnnotation(next, 18, 10)).toMatchObject({
      bookmarked: true,
      note: "Cave dua",
      updatedAt: later.toISOString(),
    });
  });

  it("a blank note deletes the note, and the entry too if it isn't bookmarked", () => {
    const withNote = setNote({}, 18, 10, "Cave dua", now);
    expect(setNote(withNote, 18, 10, "   ", later)).toEqual({});
  });

  it("a blank note on a bookmarked verse leaves the bookmark", () => {
    let annotations = toggleBookmark({}, 18, 10, now);
    annotations = setNote(annotations, 18, 10, "Cave dua", now);
    annotations = setNote(annotations, 18, 10, "", later);
    const annotation = getAnnotation(annotations, 18, 10);
    expect(annotation?.bookmarked).toBe(true);
    expect(annotation?.note).toBeUndefined();
  });
});

describe("listAnnotations", () => {
  it("returns entries in mushaf order regardless of insertion order", () => {
    let annotations = toggleBookmark({}, 36, 1, now);
    annotations = toggleBookmark(annotations, 2, 255, now);
    annotations = toggleBookmark(annotations, 2, 10, now);
    expect(listAnnotations(annotations).map((a) => verseKey(a.surah, a.ayah))).toEqual(["2:10", "2:255", "36:1"]);
  });
});

describe("formatVerseForSharing", () => {
  const verse = { surah: 1, ayah: 2, uthmaniText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" };

  it("includes the Arabic text and a citation", () => {
    expect(formatVerseForSharing(verse, "Al-Faatiha")).toBe(`${verse.uthmaniText}\n\n(Al-Faatiha 1:2)`);
  });

  it("adds the translation between text and citation when given", () => {
    expect(formatVerseForSharing(verse, "Al-Faatiha", "Praise be to Allah")).toBe(
      `${verse.uthmaniText}\n\nPraise be to Allah\n\n(Al-Faatiha 1:2)`
    );
  });
});
