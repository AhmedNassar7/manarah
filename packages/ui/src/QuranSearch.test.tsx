import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QuranSearchHit, QuranSearchResponse, Surah } from "@manarah/core";
import { QuranSearch } from "./QuranSearch.js";

const surahs: Surah[] = [
  { number: 1, nameArabic: "سُورَةُ ٱلْفَاتِحَةِ", nameTransliterated: "Al-Faatiha", revelationType: "Meccan", verseCount: 7 },
  { number: 2, nameArabic: "سُورَةُ ٱلْبَقَرَةِ", nameTransliterated: "Al-Baqara", revelationType: "Medinan", verseCount: 286 },
];

const RAHMAN = "ٱلرَّحْمَٰنِ";
const BASMALA = `بِسْمِ ٱللَّهِ ${RAHMAN} ٱلرَّحِيمِ`;
const rahmanStart = BASMALA.indexOf(RAHMAN);

const arabicHit: QuranSearchHit = {
  surah: 1,
  ayah: 1,
  uthmaniText: BASMALA,
  translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  field: "arabic",
  ranges: [[rahmanStart, rahmanStart + RAHMAN.length]],
};
const translationHit: QuranSearchHit = {
  surah: 2,
  ayah: 255,
  uthmaniText: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ",
  translation: "Allah - there is no deity except Him",
  field: "translation",
  ranges: [[0, 5]],
};

function respond(hits: QuranSearchHit[], total = hits.length): QuranSearchResponse {
  return { field: hits[0]?.field ?? "arabic", total, hits };
}

function type(value: string) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
}

describe("QuranSearch", () => {
  it("renders nothing but the box until a query of at least two letters is typed", () => {
    const search = vi.fn();
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("a");
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("searches as you type and lists hits with the surah name and a count", async () => {
    const search = vi.fn().mockResolvedValue(respond([arabicHit, translationHit]));
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("  allah ");

    expect(await screen.findByText("Verses found: 2")).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith("allah", 50);
    expect(screen.getByText("Al-Faatiha · verse 1")).toBeInTheDocument();
    expect(screen.getByText("Al-Baqara · verse 255")).toBeInTheDocument();
  });

  it("highlights the matched part of the Arabic text, or of the translation, whichever was searched", async () => {
    const search = vi.fn().mockResolvedValue(respond([arabicHit, translationHit]));
    const { container } = render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("x1");
    await screen.findByText("Verses found: 2");

    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual([RAHMAN, "Allah"]);
  });

  it("jumps to a result and clears the box when one is chosen", async () => {
    const onSelect = vi.fn();
    const search = vi.fn().mockResolvedValue(respond([translationHit]));
    render(<QuranSearch surahs={surahs} search={search} onSelect={onSelect} />);
    type("deity");

    fireEvent.click(await screen.findByRole("button", { name: /Al-Baqara · verse 255/ }));
    expect(onSelect).toHaveBeenCalledWith({ surah: 2, ayah: 255 });
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("treats a verse reference as a jump, without searching", () => {
    const onSelect = vi.fn();
    const search = vi.fn();
    render(<QuranSearch surahs={surahs} search={search} onSelect={onSelect} />);
    type("2:255");

    fireEvent.click(screen.getByRole("button", { name: "Go to Al-Baqara · verse 255" }));
    expect(onSelect).toHaveBeenCalledWith({ surah: 2, ayah: 255 });
    expect(search).not.toHaveBeenCalled();
  });

  it("falls back to a normal search for an out-of-range reference", async () => {
    const search = vi.fn().mockResolvedValue(respond([]));
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("1:99");
    expect(await screen.findByText("No verses found")).toBeInTheDocument();
  });

  it("shows a no-results message", async () => {
    const search = vi.fn().mockResolvedValue(respond([]));
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("zzzz");
    expect(await screen.findByText("No verses found")).toBeInTheDocument();
  });

  it("shows an error when the search fails", async () => {
    const search = vi.fn().mockRejectedValue(new Error("boom"));
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("mercy");
    expect(await screen.findByRole("alert")).toHaveTextContent("Search failed");
  });

  it("loads more results on request", async () => {
    const search = vi.fn().mockImplementation(async (_query: string, limit: number) =>
      respond(
        Array.from({ length: Math.min(limit, 120) }, (_, i) => ({ ...arabicHit, ayah: i + 1 })),
        120
      )
    );
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("allah");

    fireEvent.click(await screen.findByRole("button", { name: "Show more (50 of 120)" }));
    expect(await screen.findByRole("button", { name: "Show more (100 of 120)" })).toBeInTheDocument();
    expect(search).toHaveBeenLastCalledWith("allah", 100);
  });

  it("ignores a slow response that was superseded by a newer query", async () => {
    let resolveSlow!: (r: QuranSearchResponse) => void;
    const search = vi.fn().mockImplementation((query: string) =>
      query === "first" ? new Promise<QuranSearchResponse>((resolve) => (resolveSlow = resolve)) : Promise.resolve(respond([translationHit]))
    );
    render(<QuranSearch surahs={surahs} search={search} onSelect={() => {}} />);
    type("first");
    type("second");
    await screen.findByText("Al-Baqara · verse 255");

    resolveSlow(respond([arabicHit]));
    await waitFor(() => expect(screen.queryByText("Al-Faatiha · verse 1")).not.toBeInTheDocument());
  });
});
