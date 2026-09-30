import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setNote, toggleBookmark, type Surah } from "@manarah/core";
import { QuranBookmarks } from "./QuranBookmarks.js";

const surahs: Surah[] = [
  {
    number: 1,
    nameArabic: "سُورَةُ ٱلْفَاتِحَةِ",
    nameTransliterated: "Al-Faatiha",
    revelationType: "Meccan",
    verseCount: 7,
  },
  {
    number: 2,
    nameArabic: "سُورَةُ ٱلْبَقَرَةِ",
    nameTransliterated: "Al-Baqara",
    revelationType: "Medinan",
    verseCount: 286,
  },
];
const now = new Date("2026-09-30T12:00:00Z");

describe("QuranBookmarks", () => {
  it("shows an empty hint and a zero count when nothing is saved", () => {
    render(<QuranBookmarks annotations={{}} surahs={surahs} onSelect={() => {}} />);
    expect(screen.getByText("Bookmarks & notes (0)")).toBeInTheDocument();
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it("lists entries in mushaf order with their notes, and jumps to one on click", () => {
    let annotations = toggleBookmark({}, 2, 255, now);
    annotations = setNote(annotations, 1, 5, "Only You we worship", now);
    const onSelect = vi.fn();
    render(<QuranBookmarks annotations={annotations} surahs={surahs} onSelect={onSelect} />);

    expect(screen.getByText("Bookmarks & notes (2)")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Al-Faatiha · verse 5");
    expect(buttons[0]).toHaveTextContent("Only You we worship");
    expect(buttons[1]).toHaveTextContent("Al-Baqara · verse 255");

    fireEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith({ surah: 2, ayah: 255 });
  });
});
