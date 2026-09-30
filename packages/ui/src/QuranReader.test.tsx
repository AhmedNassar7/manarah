import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setNote, toggleBookmark, type Surah, type Translation, type Verse } from "@manarah/core";
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

  it("reveals and persistently highlights a playingAyah past the initial batch", () => {
    const longSurah: Surah = { ...alFatiha, number: 2, verseCount: 286 };
    const longVerses: Verse[] = Array.from({ length: 286 }, (_, i) => ({
      surah: 2,
      ayah: i + 1,
      uthmaniText: `verse ${i + 1}`,
    }));

    render(<QuranReader surah={longSurah} verses={longVerses} playingAyah={150} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(150);
    expect(items[149]).toHaveClass("quran-reader-verse-playing");
    expect(items[0]).not.toHaveClass("quran-reader-verse-playing");
  });

  it("renders a per-verse play button only when onPlayAyah is supplied, and calls it with that verse's ayah", () => {
    const onPlayAyah = vi.fn();
    render(<QuranReader surah={alFatiha} verses={verses} onPlayAyah={onPlayAyah} />);

    const playButtons = screen.getAllByRole("button", { name: /Play verse/ });
    expect(playButtons).toHaveLength(2);

    fireEvent.click(playButtons[1]);
    expect(onPlayAyah).toHaveBeenCalledWith(2);
  });

  it("renders no play buttons when onPlayAyah is not supplied", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    expect(screen.queryByRole("button", { name: /Play verse/ })).not.toBeInTheDocument();
  });

  it("opens one verse's action toolbar at a time from its ⋯ button", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    const [first, second] = screen.getAllByRole("button", { name: /Actions for verse/ });

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(1);

    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(1);

    fireEvent.click(second);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("marks bookmarked verses and shows notes inline", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    let annotations = toggleBookmark({}, 1, 1, now);
    annotations = setNote(annotations, 1, 2, "Gratitude", now);
    render(<QuranReader surah={alFatiha} verses={verses} annotations={annotations} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("quran-reader-verse-bookmarked");
    expect(items[1]).not.toHaveClass("quran-reader-verse-bookmarked");
    expect(items[1]).toHaveTextContent("Gratitude");
  });

  it("routes toolbar bookmark and note actions to the verse they were opened on", () => {
    const onToggleBookmark = vi.fn();
    const onSaveNote = vi.fn();
    render(
      <QuranReader surah={alFatiha} verses={verses} onToggleBookmark={onToggleBookmark} onSaveNote={onSaveNote} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions for verse 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(onToggleBookmark).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Note for verse 2" }), { target: { value: "Reflect" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(onSaveNote).toHaveBeenCalledWith(2, "Reflect");
  });

  it("opens a verse's tafsir from its toolbar, and keeps it open after the toolbar closes", async () => {
    const load = vi.fn().mockResolvedValue({ verseKeys: ["1:2"], blocks: [{ kind: "paragraph", text: "Praise" }] });
    const tafsir = {
      editions: [{ id: "saadi", quranComId: 91, language: "ar" as const }],
      editionId: "saadi",
      onEditionChange: vi.fn(),
      load,
    };
    render(<QuranReader surah={alFatiha} verses={verses} tafsir={tafsir} />);

    const actions = screen.getByRole("button", { name: "Actions for verse 2" });
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("button", { name: "Tafsir" }));
    expect(await screen.findByText("Praise")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith(tafsir.editions[0], 1, 2);

    fireEvent.click(actions);
    expect(screen.getByText("Praise")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close tafsir" }));
    expect(screen.queryByText("Praise")).not.toBeInTheDocument();
  });

  it("offers no Tafsir button when no tafsir source is supplied", () => {
    render(<QuranReader surah={alFatiha} verses={verses} />);
    fireEvent.click(screen.getByRole("button", { name: "Actions for verse 1" }));
    expect(screen.queryByRole("button", { name: "Tafsir" })).not.toBeInTheDocument();
  });

  it("opens a verse's word-by-word panel from its toolbar, independently of tafsir", async () => {
    const loadWords = vi
      .fn()
      .mockResolvedValue([
        { position: 1, text: "ٱلْحَمْدُ", transliteration: "al-ḥamdu", translation: "All praises and thanks" },
      ]);
    render(<QuranReader surah={alFatiha} verses={verses} loadWords={loadWords} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions for verse 2" }));
    expect(screen.queryByRole("button", { name: "Tafsir" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Word by word" }));
    expect(await screen.findByText("All praises and thanks")).toBeInTheDocument();
    expect(loadWords).toHaveBeenCalledWith(1, 2);

    fireEvent.click(screen.getByRole("button", { name: "Hide word by word" }));
    expect(screen.queryByText("All praises and thanks")).not.toBeInTheDocument();
  });
});
