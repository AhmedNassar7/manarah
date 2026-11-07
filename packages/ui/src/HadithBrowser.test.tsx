import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HadithCollection, HadithCollectionId, HadithEntry, HadithSection } from "@manarah/core";
import { HadithBrowser, type HadithBrowserProps } from "./HadithBrowser.js";
import { LanguageProvider } from "./i18n/index.js";

const collections: HadithCollection[] = [
  { id: "bukhari", arabicEdition: "ara-bukhari", englishEdition: "eng-bukhari" },
  { id: "abudawud", arabicEdition: "ara-abudawud", englishEdition: "eng-abudawud" },
  { id: "nawawi", arabicEdition: "ara-nawawi", englishEdition: "eng-nawawi" },
];
const sectionsById: Record<string, HadithSection[]> = {
  bukhari: [
    { number: 1, title: "Revelation", titleAr: "كتاب بدء الوحى", count: 7 },
    { number: 2, title: "Belief", titleAr: "كتاب الإيمان", count: 51 },
  ],
  abudawud: [
    { number: 1, title: "Purification (Kitab Al-Taharah)", titleAr: "كتاب الطهارة", count: 390 },
    { number: 2, title: "Prayer (Kitab Al-Salat)", titleAr: "كتاب الصلاة", count: 100 },
  ],
  nawawi: [{ number: 1, title: "Forty Hadith of an-Nawawi", titleAr: "الأربعون النووية", count: 42 }],
};
const getSections = (id: HadithCollectionId) => sectionsById[id] ?? [];

function entry(n: number, extra: Partial<HadithEntry> = {}): HadithEntry {
  return {
    number: n,
    displayNumber: String(n),
    arabic: `نص عربي ${n}`,
    english: `English text ${n}`,
    grades: [],
    book: 1,
    inBook: n,
    ...extra,
  };
}

function setup(overrides: Partial<HadithBrowserProps> = {}) {
  const props: HadithBrowserProps = {
    collections,
    getSections,
    load: vi.fn().mockResolvedValue([entry(1), entry(2)]),
    showTranslation: false,
    onShowTranslationChange: vi.fn(),
    ...overrides,
  };
  render(<HadithBrowser {...props} />);
  return props;
}

async function openFirstBook() {
  fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
  await screen.findByText("نص عربي 1");
}

describe("HadithBrowser — choosing a book", () => {
  it("opens on the first collection's books, with title and hadith counts", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Sahih al-Bukhari" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Revelation/ })).toHaveTextContent("7 hadiths");
    expect(screen.getByRole("button", { name: /Belief/ })).toHaveTextContent("51 hadiths");
  });

  it("switches collection from the tabs", () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Sunan Abu Dawud" }));
    expect(screen.getByRole("tab", { name: "Sunan Abu Dawud" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Purification/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revelation/ })).not.toBeInTheDocument();
  });

  it("filters books by title or number", () => {
    setup();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "belief" } });
    expect(screen.queryByRole("button", { name: /Revelation/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Belief/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "1" } });
    expect(screen.getByRole("button", { name: /Revelation/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No matching books")).toBeInTheDocument();
  });
});

describe("HadithBrowser — reading a book", () => {
  it("loads the chosen book of the chosen collection and shows each hadith in Arabic", async () => {
    const props = setup();
    await openFirstBook();
    expect(props.load).toHaveBeenCalledWith(collections[0], 1);
    expect(screen.getByText("نص عربي 2")).toBeInTheDocument();
    expect(screen.getByText("Hadith 1")).toBeInTheDocument();
    expect(screen.getByText("Book 1 · No. 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Revelation" })).toBeInTheDocument();
  });

  it("is Arabic-only until the translation is turned on", async () => {
    const props = setup();
    await openFirstBook();
    expect(screen.queryByText("English text 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(props.onShowTranslationChange).toHaveBeenCalledWith(true);
  });

  it("shows the translation when enabled, and the toggle offers to hide it", async () => {
    setup({ showTranslation: true });
    await openFirstBook();
    expect(screen.getByText("English text 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide translation" })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to the English when a hadith has no Arabic text, even with the translation off", async () => {
    setup({ load: vi.fn().mockResolvedValue([entry(1, { arabic: undefined })]) });
    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    expect(await screen.findByText("English text 1")).toBeInTheDocument();
  });

  it("attributes each grading to its scholar, and shows none when the source gives none", async () => {
    setup({
      load: vi.fn().mockResolvedValue([
        entry(1, { grades: [{ scholar: "Al-Albani", grade: "Hasan Sahih" }, { scholar: "Zubair Ali Zai", grade: "Isnaad Hasan" }] }),
        entry(2),
      ]),
    });
    await openFirstBook();
    const grades = screen.getByRole("list", { name: "Gradings" });
    expect(within(grades).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Al-Albani: Hasan Sahih",
      "Zubair Ali Zai: Isnaad Hasan",
    ]);
    expect(screen.getAllByRole("list", { name: "Gradings" })).toHaveLength(1);
  });

  it("goes back to the book list", async () => {
    setup();
    await openFirstBook();
    fireEvent.click(screen.getByRole("button", { name: "All books" }));
    expect(screen.getByRole("button", { name: /Belief/ })).toBeInTheDocument();
  });

  it("shows a loading state, then reveals long books in batches", async () => {
    const many = Array.from({ length: 60 }, (_, i) => entry(i + 1));
    setup({ load: vi.fn().mockResolvedValue(many) });
    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading");

    await screen.findByText("نص عربي 1");
    expect(screen.getAllByRole("listitem").filter((li) => li.className === "hadith-card")).toHaveLength(25);
    fireEvent.click(screen.getByRole("button", { name: "Show more (25 of 60)" }));
    expect(screen.getAllByRole("listitem").filter((li) => li.className === "hadith-card")).toHaveLength(50);
  });

  it("offers a retry that really reloads after a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue([entry(1)]);
    setup({ load });
    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this book");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("نص عربي 1")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores a slow response for a book the user has already left", async () => {
    let resolveSlow!: (entries: HadithEntry[]) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<HadithEntry[]>((resolve) => (resolveSlow = resolve)))
      .mockResolvedValue([entry(9)]);
    setup({ load });

    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    fireEvent.click(screen.getByRole("button", { name: "All books" }));
    fireEvent.click(screen.getByRole("button", { name: /Belief/ }));
    await screen.findByText("نص عربي 9");

    resolveSlow([entry(1)]);
    await waitFor(() => expect(screen.queryByText("نص عربي 1")).not.toBeInTheDocument());
  });
});

describe("HadithBrowser — copying", () => {
  it("copies the Arabic with a citation, plus the translation only when it is showing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    setup({ load: vi.fn().mockResolvedValue([entry(1)]) });
    await openFirstBook();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("نص عربي 1\n\n(Sahih al-Bukhari 1)"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});

describe("HadithBrowser — book titles follow the language", () => {
  function renderIn(language: "en" | "ar") {
    render(
      <LanguageProvider language={language} onLanguageChange={() => {}}>
        <HadithBrowser
          collections={collections}
          getSections={getSections}
          load={vi.fn().mockResolvedValue([entry(1)])}
          showTranslation={false}
          onShowTranslationChange={vi.fn()}
        />
      </LanguageProvider>,
    );
  }

  it("shows English book titles in English", () => {
    renderIn("en");
    expect(screen.getByText("Revelation")).toBeInTheDocument();
    expect(screen.queryByText("كتاب بدء الوحى")).not.toBeInTheDocument();
  });

  it("shows Arabic book titles — and no English ones, and no 'titles are in English' note — in Arabic", () => {
    renderIn("ar");
    expect(screen.getByText("كتاب بدء الوحى")).toBeInTheDocument();
    expect(screen.getByText("كتاب الإيمان")).toBeInTheDocument();
    expect(screen.queryByText("Revelation")).not.toBeInTheDocument();
    expect(screen.queryByText("Belief")).not.toBeInTheDocument();
    expect(document.querySelector(".hadith-note")).toBeNull();
  });

  it("filters books by their Arabic title, and by the English one too", () => {
    renderIn("ar");
    const box = screen.getByRole("searchbox");
    fireEvent.change(box, { target: { value: "الإيمان" } });
    expect(screen.getByText("كتاب الإيمان")).toBeInTheDocument();
    expect(screen.queryByText("كتاب بدء الوحى")).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: "revelation" } });
    expect(screen.getByText("كتاب بدء الوحى")).toBeInTheDocument();
  });

  it("puts the Arabic title in the open book's heading", async () => {
    renderIn("ar");
    fireEvent.click(screen.getByText("كتاب الإيمان"));
    const heading = await screen.findByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("كتاب الإيمان");
    expect(heading).not.toHaveTextContent("Belief");
  });
});

describe("HadithBrowser — while a book loads", () => {
  it("shows skeleton cards in the shape of the hadiths coming, and tells a screen reader it is loading", () => {
    setup({ load: vi.fn().mockReturnValue(new Promise(() => {})) });
    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    expect(document.querySelectorAll(".skeleton-card")).toHaveLength(3);
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
    // The shimmer is decoration; the loading message is for assistive technology.
    expect(document.querySelector(".skeleton-card")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("replaces the skeleton with the hadiths once they arrive", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Revelation/ }));
    await screen.findByText("نص عربي 1");
    expect(document.querySelectorAll(".skeleton-card")).toHaveLength(0);
  });
});


describe("HadithBrowser — a collection of one book", () => {
  it("opens straight onto its hadith, with a line about it and no list of one or 'All books' button", async () => {
    const props = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Forty Hadith of an-Nawawi" }));
    await screen.findByText("نص عربي 1");
    expect(props.load).toHaveBeenCalledWith(collections[2], 1);
    expect(screen.getByText(/42 comprehensive hadith gathered by Imam al-Nawawi/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /All books/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("a collection with many books has no such line, and keeps its list", () => {
    setup();
    expect(document.querySelector(".hadith-about")).toBeNull();
    expect(screen.getByRole("button", { name: /Revelation/ })).toBeInTheDocument();
  });

  it("says it in Arabic too", async () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <HadithBrowser collections={collections} getSections={getSections} load={vi.fn().mockResolvedValue([entry(1)])} showTranslation={false} onShowTranslationChange={() => {}} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "الأربعون النووية" }));
    await screen.findByText("نص عربي 1");
    expect(screen.getByText(/اثنان وأربعون حديثًا جامعًا جمعها الإمام النووي/)).toBeInTheDocument();
  });
});
