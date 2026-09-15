import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Surah, Verse } from "@manarah/core";
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

describe("QuranReader", () => {
  it("renders the surah's Arabic name and metadata line", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    expect(screen.getByRole("heading", { name: "سُورَةُ ٱلْفَاتِحَةِ" })).toBeInTheDocument();
    expect(screen.getByText(/Al-Faatiha.*Meccan.*2 verses/)).toBeInTheDocument();
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
});
