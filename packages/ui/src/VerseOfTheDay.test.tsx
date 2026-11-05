import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Surah, Verse } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { VerseOfTheDay } from "./VerseOfTheDay.js";

const surah: Surah = {
  number: 112,
  nameArabic: "سُورَةُ ٱلْإِخْلَاص",
  nameTransliterated: "Al-Ikhlas",
  revelationType: "Meccan",
  verseCount: 4,
};

const verse: Verse = { surah: 112, ayah: 1, uthmaniText: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" };

describe("VerseOfTheDay", () => {
  it("renders the verse text", () => {
    render(<VerseOfTheDay verse={verse} surah={surah} />);
    expect(screen.getByText("قُلْ هُوَ ٱللَّهُ أَحَدٌ")).toBeInTheDocument();
  });

  it("renders the surah:ayah reference", () => {
    render(<VerseOfTheDay verse={verse} surah={surah} />);
    expect(screen.getByText("Al-Ikhlas 112:1")).toBeInTheDocument();
  });

  it("names the surah in Arabic — not transliterated — when the language is Arabic", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <VerseOfTheDay verse={verse} surah={surah} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/سُورَةُ ٱلْإِخْلَاص 112:1/)).toBeInTheDocument();
    expect(screen.queryByText(/Al-Ikhlas/)).not.toBeInTheDocument();
  });

  it("marks the verse right-to-left for Arabic", () => {
    const { container } = render(<VerseOfTheDay verse={verse} surah={surah} />);
    const figure = container.querySelector("figure");
    expect(figure).toHaveAttribute("dir", "rtl");
    expect(figure).toHaveAttribute("lang", "ar");
  });
});
