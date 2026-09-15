import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Surah, Translation, Verse } from "@manarah/core";
import { QuranReader } from "./QuranReader.js";

const alFatiha: Surah = {
  number: 1,
  nameArabic: "سُورَةُ ٱلْفَاتِحَةِ",
  nameTransliterated: "Al-Faatiha",
  revelationType: "Meccan",
  verseCount: 2,
};

const verses: Verse[] = [
  { surah: 1, ayah: 1, uthmaniText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" },
  { surah: 1, ayah: 2, uthmaniText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" },
];

const translations: Translation[] = [
  { surah: 1, ayah: 1, text: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
  { surah: 1, ayah: 2, text: "[All] praise is [due] to Allah, Lord of the worlds." },
];

describe("QuranReader", () => {
  it("renders the surah's Arabic name and metadata line", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    expect(screen.getByRole("heading", { name: "سُورَةُ ٱلْفَاتِحَةِ" })).toBeInTheDocument();
    // The transliterated name is wrapped in its own dir="ltr" span (bidi
    // correctness inside the surrounding RTL section), so the metadata
    // line's text is split across elements — match by combined textContent
    // rather than a getByText regex, which only matches a single text node.
    const metaLine = screen.getByText((_, element) => element?.tagName.toLowerCase() === "p");
    expect(metaLine).toHaveTextContent(/Al-Faatiha.*Meccan.*2 verses/);
  });

  it("renders every verse as a numbered list item", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(verses[0].uthmaniText);
    expect(items[0]).toHaveAttribute("value", "1");
    expect(items[1]).toHaveTextContent(verses[1].uthmaniText);
    expect(items[1]).toHaveAttribute("value", "2");
  });

  it("marks the Arabic text section right-to-left", () => {
    const { container } = render(<QuranReader surah={alFatiha} verses={verses} />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("dir", "rtl");
    expect(section).toHaveAttribute("lang", "ar");
  });

  it("renders nothing but the header when there are no verses", () => {
    render(<QuranReader surah={{ ...alFatiha, verseCount: 0 }} verses={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders a long surah in batches instead of every verse at once", () => {
    const longSurah: Surah = { ...alFatiha, number: 2, verseCount: 286 };
    const longVerses: Verse[] = Array.from({ length: 286 }, (_, i) => ({
      surah: 2,
      ayah: i + 1,
      uthmaniText: `verse ${i + 1}`,
    }));

    render(<QuranReader surah={longSurah} verses={longVerses} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(40);
    expect(screen.getByRole("button", { name: /Load more — 40 of 286 verses/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(80);
  });

  it("shows translation text by default when translations are provided, and can be hidden", () => {
    render(<QuranReader surah={alFatiha} verses={verses} translations={translations} />);

    expect(screen.getByText(translations[0].text)).toBeInTheDocument();
    expect(screen.getByText(translations[1].text)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide translation" }));
    expect(screen.queryByText(translations[0].text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(screen.getByText(translations[0].text)).toBeInTheDocument();
  });

  it("renders no translation toggle or text when no translations are provided", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    expect(screen.queryByRole("button", { name: /translation/i })).not.toBeInTheDocument();
  });

  it("reveals a focusAyah past the initial batch and highlights it", () => {
    const longSurah: Surah = { ...alFatiha, number: 2, verseCount: 286 };
    const longVerses: Verse[] = Array.from({ length: 286 }, (_, i) => ({
      surah: 2,
      ayah: i + 1,
      uthmaniText: `verse ${i + 1}`,
    }));

    render(<QuranReader surah={longSurah} verses={longVerses} focusAyah={150} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(150);
    expect(items[149]).toHaveClass("quran-reader-verse-highlight");
    expect(items[0]).not.toHaveClass("quran-reader-verse-highlight");
  });
});
