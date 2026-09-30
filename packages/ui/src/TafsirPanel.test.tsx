import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TafsirEdition, TafsirEntry } from "@manarah/core";
import { TafsirPanel, type TafsirSource } from "./TafsirPanel.js";

const saadi: TafsirEdition = { id: "saadi", quranComId: 91, language: "ar" };
const ibnKathirEn: TafsirEdition = { id: "ibn-kathir-en", quranComId: 169, language: "en" };

const entry: TafsirEntry = {
  verseKeys: ["2:255"],
  blocks: [
    { kind: "heading", text: "The Virtue of Ayat Al-Kursi" },
    { kind: "paragraph", text: "This is the greatest verse." },
  ],
};

function makeSource(overrides: Partial<TafsirSource> = {}): TafsirSource {
  return {
    editions: [ibnKathirEn, saadi],
    editionId: "ibn-kathir-en",
    onEditionChange: vi.fn(),
    load: vi.fn().mockResolvedValue(entry),
    ...overrides,
  };
}

describe("TafsirPanel", () => {
  it("shows a loading state, then the loaded headings and paragraphs as text", async () => {
    const source = makeSource();
    render(<TafsirPanel source={source} surah={2} ayah={255} onClose={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading tafsir…");
    expect(await screen.findByRole("heading", { name: "The Virtue of Ayat Al-Kursi" })).toBeInTheDocument();
    expect(screen.getByText("This is the greatest verse.")).toBeInTheDocument();
    expect(screen.getByText("Source: Quran.com")).toBeInTheDocument();
    expect(source.load).toHaveBeenCalledWith(ibnKathirEn, 2, 255);
  });

  it("marks Arabic commentary right-to-left, whatever the UI language", async () => {
    const { container } = render(
      <TafsirPanel source={makeSource({ editionId: "saadi" })} surah={2} ayah={255} onClose={() => {}} />
    );
    await screen.findByText("This is the greatest verse.");
    const text = container.querySelector(".tafsir-panel-text");
    expect(text).toHaveAttribute("dir", "rtl");
    expect(text).toHaveAttribute("lang", "ar");
  });

  it("lists every edition and reports a change of source", async () => {
    const source = makeSource();
    render(<TafsirPanel source={source} surah={2} ayah={255} onClose={() => {}} />);
    await screen.findByText("This is the greatest verse.");

    const select = screen.getByRole("combobox", { name: "Tafsir" });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Ibn Kathir (abridged, English)",
      "As-Sa'di (Arabic)",
    ]);
    fireEvent.change(select, { target: { value: "saadi" } });
    expect(source.onEditionChange).toHaveBeenCalledWith("saadi");
  });

  it("shows an error with a retry that loads again", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(entry);
    render(<TafsirPanel source={makeSource({ load })} surah={2} ayah={255} onClose={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load the tafsir/);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByText("This is the greatest verse.")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("explains an empty entry, and notes when commentary spans several verses", async () => {
    const { unmount } = render(
      <TafsirPanel
        source={makeSource({ load: vi.fn().mockResolvedValue({ verseKeys: ["2:7"], blocks: [] }) })}
        surah={2}
        ayah={7}
        onClose={() => {}}
      />
    );
    expect(await screen.findByText(/no separate commentary on this verse/)).toBeInTheDocument();
    unmount();

    render(
      <TafsirPanel
        source={makeSource({ load: vi.fn().mockResolvedValue({ ...entry, verseKeys: ["2:6", "2:7"] }) })}
        surah={2}
        ayah={6}
        onClose={() => {}}
      />
    );
    expect(await screen.findByText("Commentary on verses 2:6–2:7")).toBeInTheDocument();
  });

  it("closes from its close button", async () => {
    const onClose = vi.fn();
    render(<TafsirPanel source={makeSource()} surah={2} ayah={255} onClose={onClose} />);
    await screen.findByText("This is the greatest verse.");
    fireEvent.click(screen.getByRole("button", { name: "Close tafsir" }));
    expect(onClose).toHaveBeenCalled();
  });
});
