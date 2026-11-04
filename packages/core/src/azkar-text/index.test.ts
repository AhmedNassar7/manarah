import { describe, expect, it } from "vitest";
import { AYAH_SEPARATOR, parseAzkarText, splitAzkarTranslation } from "./index.js";

const kinds = (text: string) => parseAzkarText(text).map((p) => p.kind);
const texts = (text: string) => parseAzkarText(text).map((p) => p.text);

describe("parseAzkarText", () => {
  it("treats plain text as a single dua", () => {
    expect(parseAzkarText("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ")).toEqual([{ kind: "dua", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ" }]);
  });

  it("drops the source's ((…)) wrapper around the words to say", () => {
    expect(parseAzkarText("((رَبِّ اغْفِرْ لِي)).")).toEqual([{ kind: "dua", text: "رَبِّ اغْفِرْ لِي" }]);
  });

  it("splits the riding dua into the three parts the reference editions show — words, verse, words", () => {
    const riding =
      "((بِسْمِ اللَّهِ، وَالْحَمْدُ للَّهِ ﴿سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ﴾، ((الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ، سُبْحَانَكَ اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي)).";
    expect(kinds(riding)).toEqual(["dua", "quran", "dua"]);
    expect(texts(riding)[0]).toBe("بِسْمِ اللَّهِ، وَالْحَمْدُ للَّهِ");
    expect(texts(riding)[1]).toMatch(/^سُبْحَانَ الَّذِي سَخَّرَ.*لَمُنقَلِبُونَ$/);
    expect(texts(riding)[2]).toMatch(/^الْحَمْدُ لِلَّهِ.*فَاغْفِرْ لِي$/);
  });

  it("separates the opening isti'adha from the verse it introduces, with no brackets left", () => {
    const parts = parseAzkarText("أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ ﴿اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ﴾.");
    expect(parts).toEqual([
      { kind: "dua", text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ" },
      { kind: "quran", text: "اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ" },
    ]);
  });

  it("marks verse breaks with the ayah-end ornament, not the source's asterisk", () => {
    const [verse] = parseAzkarText("﴿قُلْ هُوَ اللَّهُ أَحَدٌ* اللَّهُ الصَّمَدُ* لَمْ يَلِدْ وَلَمْ يُولَدْ﴾");
    expect(verse.kind).toBe("quran");
    expect(verse.text).toBe(`قُلْ هُوَ اللَّهُ أَحَدٌ ${AYAH_SEPARATOR} اللَّهُ الصَّمَدُ ${AYAH_SEPARATOR} لَمْ يَلِدْ وَلَمْ يُولَدْ`);
  });

  it("treats a (…) group that contains a verse like a ((…)) group — each surah with its basmala", () => {
    const text = "(بسم الله الرحمن الرحيم ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾.) (بسم الله الرحمن الرحيم ﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ﴾.)";
    expect(kinds(text)).toEqual(["dua", "quran", "dua", "quran"]);
    expect(texts(text)[0]).toBe("بسم الله الرحمن الرحيم");
  });

  it("keeps a repetition instruction as a note, apart from the dua it follows", () => {
    expect(parseAzkarText("((حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ)) (سَبْعَ مَرّاتٍ).")).toEqual([
      { kind: "dua", text: "حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ" },
      { kind: "note", text: "(سَبْعَ مَرّاتٍ)" },
    ]);
  });

  it("treats an introduction ending in a colon as a note, and the quoted words as the dua", () => {
    expect(parseAzkarText("قَالَ النَّبِيُّ صلى الله عليه وسلم: ((اللَّهُمَّ أَعِنِّي))")).toEqual([
      { kind: "note", text: "قَالَ النَّبِيُّ صلى الله عليه وسلم:" },
      { kind: "dua", text: "اللَّهُمَّ أَعِنِّي" },
    ]);
  });

  it("shows a bracketed alternative wording — the evening version — as its own variant part, without the brackets", () => {
    const parts = parseAzkarText("((اللَّهُمَّ بِكَ أَصْبَحْنَا)). [وإذا أمسى قال: اللَّهم بك أمسينا]");
    expect(parts).toEqual([
      { kind: "dua", text: "اللَّهُمَّ بِكَ أَصْبَحْنَا" },
      { kind: "variant", text: "وإذا أمسى قال: اللَّهم بك أمسينا" },
    ]);
  });

  it("gives each of two adjacent bracketed variants its own part, with no ] [ left between them", () => {
    const parts = parseAzkarText("((اللَّهُمَّ بِكَ أَصْبَحْنَا)). [وإذا أمسى قال: أمسينا] [وإذا أمسى قال: رب أسألك]");
    expect(parts.map((p) => p.kind)).toEqual(["dua", "variant", "variant"]);
    expect(parts[1].text).toBe("وإذا أمسى قال: أمسينا");
    expect(parts[2].text).toBe("وإذا أمسى قال: رب أسألك");
  });

  it("separates a repetition instruction from a variant that follows it", () => {
    const parts = parseAzkarText("((اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ)) (أربعَ مَرَّاتٍ).[ وإذا أمسى قال: اللَّهم إني أمسيت]");
    expect(parts.map((p) => p.kind)).toEqual(["dua", "note", "variant"]);
    expect(parts[1].text).toBe("(أربعَ مَرَّاتٍ)");
    expect(parts[2].text).toBe("وإذا أمسى قال: اللَّهم إني أمسيت");
  });

  it("copes with the source's nested/unbalanced markers: a second (( just starts a new part", () => {
    expect(parseAzkarText("((يَقُولُ: ((آمَنْتُ بِاللَّهِ وَرُسُلِهِ)).")).toEqual([
      { kind: "note", text: "يَقُولُ:" },
      { kind: "dua", text: "آمَنْتُ بِاللَّهِ وَرُسُلِهِ" },
    ]);
  });

  it("ignores a stray closing marker, and an unclosed verse bracket still yields its verse", () => {
    expect(kinds("سُبْحَانَ اللَّهِ)).")).toEqual(["dua"]);
    expect(parseAzkarText("﴿إِنَّ فِي خَلْقِ السَّمَوَاتِ")).toEqual([{ kind: "quran", text: "إِنَّ فِي خَلْقِ السَّمَوَاتِ" }]);
  });

  it("returns nothing for empty or punctuation-only text, and never an empty part", () => {
    expect(parseAzkarText("")).toEqual([]);
    expect(parseAzkarText("(( )) ، . ))")).toEqual([]);
    expect(parseAzkarText("((أ)) ، ((ب))").every((p) => p.text.trim() !== "")).toBe(true);
  });
});

describe("splitAzkarTranslation", () => {
  it("drops the parentheses wrapping a single-part translation, and tidies double spaces", () => {
    expect(splitAzkarTranslation("(In the name of Allah.  All praise is for Allah.)")).toEqual(["In the name of Allah. All praise is for Allah."]);
  });

  it("returns an unwrapped translation as it is", () => {
    expect(splitAzkarTranslation("Glory is to Allah.")).toEqual(["Glory is to Allah."]);
  });

  it("splits parts and keeps a repetition instruction in its parentheses", () => {
    expect(splitAzkarTranslation("(O Allah, I seek refuge in You.)(three times) (O Allah, forgive me.)")).toEqual([
      "O Allah, I seek refuge in You.",
      "(three times)",
      "O Allah, forgive me.",
    ]);
  });

  it("keeps the bracketed evening variant between its two parts", () => {
    expect(splitAzkarTranslation("(Morning wording here.)[In the evening:](Evening wording here.)")).toEqual([
      "Morning wording here.",
      "[In the evening:]",
      "Evening wording here.",
    ]);
  });

  it("keeps a short dua's own words — only repetition instructions keep their parentheses", () => {
    expect(splitAzkarTranslation("(In Your name O Allah, I live and die.)")).toEqual(["In Your name O Allah, I live and die."]);
  });

  it("keeps nested parentheses inside a part intact", () => {
    expect(splitAzkarTranslation("(Say this. (three times))")).toEqual(["Say this. (three times)"]);
  });

  it("leaves an unbalanced translation exactly as given rather than guessing", () => {
    expect(splitAzkarTranslation("(Never closed")).toEqual(["(Never closed"]);
    expect(splitAzkarTranslation("Closed too early) here")).toEqual(["Closed too early) here"]);
  });

  it("returns nothing for empty text", () => {
    expect(splitAzkarTranslation("   ")).toEqual([]);
  });
});
