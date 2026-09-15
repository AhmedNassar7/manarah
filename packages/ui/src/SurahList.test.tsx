import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Surah } from "@manarah/core";
import { SurahList } from "./SurahList.js";

const surahs: Surah[] = [
  { number: 1, nameArabic: "سُورَةُ ٱلْفَاتِحَةِ", nameTransliterated: "Al-Faatiha", revelationType: "Meccan", verseCount: 7 },
  { number: 2, nameArabic: "سُورَةُ ٱلْبَقَرَةِ", nameTransliterated: "Al-Baqara", revelationType: "Medinan", verseCount: 286 },
];

describe("SurahList", () => {
  it("renders every surah with its name and verse count", () => {
    render(<SurahList surahs={surahs} onSelect={vi.fn()} />);
    expect(screen.getByText("Al-Faatiha · 7 verses")).toBeInTheDocument();
    expect(screen.getByText("Al-Baqara · 286 verses")).toBeInTheDocument();
  });

  it("calls onSelect with the surah number when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SurahList surahs={surahs} onSelect={onSelect} />);

    await user.click(screen.getByText("Al-Baqara · 286 verses"));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("marks the currently selected surah with aria-current", () => {
    render(<SurahList surahs={surahs} onSelect={vi.fn()} selectedSurah={2} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).not.toHaveAttribute("aria-current");
    expect(buttons[1]).toHaveAttribute("aria-current", "true");
  });

  it("renders no aria-current markers when nothing is selected", () => {
    render(<SurahList surahs={surahs} onSelect={vi.fn()} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-current");
    }
  });
});
