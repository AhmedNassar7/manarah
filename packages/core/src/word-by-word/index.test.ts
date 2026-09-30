import { describe, expect, it } from "vitest";
import { parseWordByWordResponse, wordByWordUrl } from "./index.js";

describe("wordByWordUrl", () => {
  it("builds the Quran.com by_key URL with words and Uthmani word text", () => {
    expect(wordByWordUrl(2, 255)).toBe(
      "https://api.quran.com/api/v4/verses/by_key/2:255?words=true&word_fields=text_uthmani"
    );
  });
});

describe("parseWordByWordResponse", () => {
  // Trimmed from a real response for 1:1, including the trailing verse-end marker.
  const response = {
    verse: {
      words: [
        {
          position: 1,
          char_type_name: "word",
          text_uthmani: "بِسْمِ",
          translation: { text: "In (the) name" },
          transliteration: { text: "bis'mi" },
        },
        {
          position: 2,
          char_type_name: "word",
          text_uthmani: "ٱللَّهِ",
          translation: { text: "(of) Allah " },
          transliteration: { text: "l-lahi" },
        },
        {
          position: 5,
          char_type_name: "end",
          text_uthmani: "١",
          translation: { text: "(1)" },
          transliteration: { text: null },
        },
      ],
    },
  };

  it("keeps words in order, drops the verse-end marker, and trims stray whitespace", () => {
    expect(parseWordByWordResponse(response)).toEqual([
      { position: 1, text: "بِسْمِ", transliteration: "bis'mi", translation: "In (the) name" },
      { position: 2, text: "ٱللَّهِ", transliteration: "l-lahi", translation: "(of) Allah" },
    ]);
  });

  it("tolerates missing translation/transliteration fields", () => {
    const words = parseWordByWordResponse({ verse: { words: [{ char_type_name: "word", text_uthmani: "رَبِّ" }] } });
    expect(words).toEqual([{ position: 1, text: "رَبِّ", transliteration: "", translation: "" }]);
  });

  it("returns no words for an empty or malformed response", () => {
    expect(parseWordByWordResponse({})).toEqual([]);
    expect(parseWordByWordResponse(null)).toEqual([]);
  });
});
