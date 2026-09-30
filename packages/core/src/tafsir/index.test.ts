import { describe, expect, it } from "vitest";
import {
  parseTafsirResponse,
  resolveTafsirEdition,
  tafsirHtmlToBlocks,
  tafsirUrl,
  type TafsirEdition,
} from "./index.js";

const saadi: TafsirEdition = { id: "saadi", quranComId: 91, language: "ar" };

describe("tafsirUrl", () => {
  it("builds the Quran.com by_ayah URL for the edition's resource id", () => {
    expect(tafsirUrl(saadi, 2, 255)).toBe("https://api.quran.com/api/v4/tafsirs/91/by_ayah/2:255");
  });
});

describe("tafsirHtmlToBlocks", () => {
  it("splits paragraphs and headings, dropping inline tags but keeping their text", () => {
    // Shape copied from real Quran.com responses (English Ibn Kathir / Arabic al-Baghawi).
    const html =
      "<h2>The Virtue of Ayat Al-Kursi</h2><p>This is <b>Ayat Al-Kursi</b>.</p>" +
      '<p lang="ar" class="ar ">قوله عز وجل : <span class="green">( الله لا إله إلا هو )</span></p>';
    expect(tafsirHtmlToBlocks(html)).toEqual([
      { kind: "heading", text: "The Virtue of Ayat Al-Kursi" },
      { kind: "paragraph", text: "This is Ayat Al-Kursi." },
      { kind: "paragraph", text: "قوله عز وجل : ( الله لا إله إلا هو )" },
    ]);
  });

  it("treats unformatted text as paragraphs split on line breaks", () => {
    expect(tafsirHtmlToBlocks("first line\nsecond line\n\n")).toEqual([
      { kind: "paragraph", text: "first line" },
      { kind: "paragraph", text: "second line" },
    ]);
  });

  it("decodes named and numeric entities", () => {
    expect(tafsirHtmlToBlocks("<p>A &amp; B &lt;C&gt; &#1575; &#x628;</p>")).toEqual([
      { kind: "paragraph", text: "A & B <C> ا ب" },
    ]);
  });

  it("never lets markup through as text — script tags are stripped, not rendered", () => {
    const blocks = tafsirHtmlToBlocks('<p>safe<script>alert("x")</script><img src=x onerror=alert(1)></p>');
    expect(blocks.map((b) => b.text).join("")).not.toMatch(/[<>]/);
  });

  it("drops empty and whitespace-only blocks", () => {
    expect(tafsirHtmlToBlocks("<p> </p><p>* * *</p><p></p><br>")).toEqual([{ kind: "paragraph", text: "* * *" }]);
  });

  it("returns no blocks for empty input", () => {
    expect(tafsirHtmlToBlocks("")).toEqual([]);
  });
});

describe("parseTafsirResponse", () => {
  it("reads the verse keys and flattened text from a Quran.com response", () => {
    const json = { tafsir: { verses: { "2:6": { id: 13 }, "2:7": { id: 14 } }, text: "<p>Commentary</p>" } };
    expect(parseTafsirResponse(json, 2, 6)).toEqual({
      verseKeys: ["2:6", "2:7"],
      blocks: [{ kind: "paragraph", text: "Commentary" }],
    });
  });

  it("falls back to the requested verse key and no blocks for an empty or malformed response", () => {
    expect(parseTafsirResponse({}, 1, 1)).toEqual({ verseKeys: ["1:1"], blocks: [] });
    expect(parseTafsirResponse(null, 1, 1)).toEqual({ verseKeys: ["1:1"], blocks: [] });
  });
});

describe("resolveTafsirEdition", () => {
  const ibnKathirEn: TafsirEdition = { id: "ibn-kathir-en", quranComId: 169, language: "en" };
  const editions = [saadi, ibnKathirEn];

  it("uses the saved choice when it exists", () => {
    expect(resolveTafsirEdition(editions, "saadi", "en")).toBe(saadi);
  });

  it("falls back to the first edition in the UI language when there's no (valid) saved choice", () => {
    expect(resolveTafsirEdition(editions, undefined, "en")).toBe(ibnKathirEn);
    expect(resolveTafsirEdition(editions, "removed-edition", "ar")).toBe(saadi);
  });

  it("falls back to the first edition when none match the UI language", () => {
    expect(resolveTafsirEdition(editions, undefined, "fr")).toBe(saadi);
    expect(resolveTafsirEdition([], undefined, "en")).toBeUndefined();
  });
});
