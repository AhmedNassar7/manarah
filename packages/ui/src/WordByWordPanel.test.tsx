import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QuranWord } from "@manarah/core";
import { WordByWordPanel } from "./WordByWordPanel.js";

const words: QuranWord[] = [
  { position: 1, text: "ٱلْحَمْدُ", transliteration: "al-ḥamdu", translation: "All praises and thanks" },
  { position: 2, text: "لِلَّهِ", transliteration: "lillahi", translation: "(be) to Allah" },
];

describe("WordByWordPanel", () => {
  it("shows a loading state, then each word with its transliteration and meaning, in order", async () => {
    const load = vi.fn().mockResolvedValue(words);
    render(<WordByWordPanel surah={1} ayah={2} load={load} onClose={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading words…");
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("ٱلْحَمْدُ");
    expect(items[0]).toHaveTextContent("al-ḥamdu");
    expect(items[0]).toHaveTextContent("All praises and thanks");
    expect(items[1]).toHaveTextContent("(be) to Allah");
    expect(screen.getByText("Source: Quran.com")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith(1, 2);
  });

  it("lays the words out right-to-left, in reading order", async () => {
    render(<WordByWordPanel surah={1} ayah={2} load={vi.fn().mockResolvedValue(words)} onClose={() => {}} />);
    const list = (await screen.findAllByRole("listitem"))[0].parentElement;
    expect(list).toHaveAttribute("dir", "rtl");
  });

  it("shows an error with a retry that loads again", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(words);
    render(<WordByWordPanel surah={1} ayah={2} load={load} onClose={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load the word-by-word meanings/);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("closes from its close button", async () => {
    const onClose = vi.fn();
    render(<WordByWordPanel surah={1} ayah={2} load={vi.fn().mockResolvedValue(words)} onClose={onClose} />);
    await screen.findAllByRole("listitem");
    fireEvent.click(screen.getByRole("button", { name: "Close word by word" }));
    expect(onClose).toHaveBeenCalled();
  });
});
