import { describe, expect, it } from "vitest";
import { TASBIH_DHIKR } from "@manarah/core";
import { AZKAR_CATEGORIES } from "./index.js";
import { ITEM_VIRTUES, TASBIH_VIRTUES, VIRTUES, virtuesForItem, virtuesForTasbih } from "./virtues.js";
import { getHadithSections } from "../hadith/index.js";

/**
 * A virtue shown on the wrong dhikr, or a quotation with one word changed, would be a
 * mistake about religion — so these tests are stricter than most. The virtues themselves
 * were extracted from the text of Sahih al-Bukhari / Sahih Muslim (see virtues.ts); what is
 * pinned here is that they stay what was extracted, and sit only where they belong.
 */
const skeleton = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]/g, "");

const virtue = (id: string) => VIRTUES.find((v) => v.id === id)!;
const itemText = (itemId: string) => skeleton(AZKAR_CATEGORIES.flatMap((c) => c.items).find((i) => i.id === itemId)?.arabic ?? "");

describe("the virtues", () => {
  it("come only from Sahih al-Bukhari and Sahih Muslim", () => {
    for (const v of VIRTUES) expect(["bukhari", "muslim"], v.id).toContain(v.collection);
    expect(new Set(VIRTUES.map((v) => v.collection))).toEqual(new Set(["bukhari", "muslim"]));
  });

  it("have unique ids, a whole-number hadith number, and Arabic words with an English meaning", () => {
    expect(new Set(VIRTUES.map((v) => v.id)).size).toBe(VIRTUES.length);
    for (const v of VIRTUES) {
      expect(v.number, v.id).toMatch(/^\d+$/);
      expect(v.arabic, v.id).toMatch(/[؀-ۿ]/);
      expect(v.meaning.length, `${v.id} has no meaning`).toBeGreaterThan(20);
    }
  });

  it("name the book each hadith is in exactly as the app's own Hadith section does", () => {
    for (const v of VIRTUES) {
      const book = getHadithSections(v.collection).find((s) => s.number === v.book);
      expect(book, `${v.id}: book ${v.book}`).toBeDefined();
      expect(v.bookTitle, v.id).toBe(book!.title);
      expect(v.bookTitleAr, v.id).toBe(book!.titleAr);
    }
  });

  it("have no leftovers of the source edition's formatting (invisible marks, stray brace characters, doubled spaces)", () => {
    for (const v of VIRTUES) {
      expect(v.arabic, v.id).not.toMatch(/[‎‏{}]/);
      expect(v.arabic, v.id).not.toMatch(/\s{2,}/);
      expect(v.arabic, v.id).toBe(v.arabic.trim());
    }
  });

  it("keep Qur'an quotations whole — every opening ornamental bracket has its closing one", () => {
    for (const v of VIRTUES) {
      expect((v.arabic.match(/﴿/g) ?? []).length, v.id).toBe((v.arabic.match(/﴾/g) ?? []).length);
    }
  });

  describe("are what was extracted from the books, word for word", () => {
    const has = (id: string, ...phrases: string[]) => phrases.forEach((p) => expect(skeleton(virtue(id).arabic), `${id}: ${p}`).toContain(skeleton(p)));

    it("Bukhari 6405: a hundred times a day, sins wiped away like the foam of the sea", () => {
      expect(virtue("subhanallah-bihamdihi-100")).toMatchObject({ collection: "bukhari", number: "6405" });
      has("subhanallah-bihamdihi-100", "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", "مِائَةَ مَرَّةٍ", "خَطَايَاهُ", "زَبَدِ الْبَحْرِ");
    });

    it("Bukhari 6406: two light words, heavy on the Scale — both phrases", () => {
      expect(virtue("two-light-words")).toMatchObject({ collection: "bukhari", number: "6406" });
      has("two-light-words", "ثَقِيلَتَانِ فِي الْمِيزَانِ", "سُبْحَانَ اللَّهِ الْعَظِيمِ", "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ");
    });

    it("Bukhari 6403: a hundred times — ten slaves, a hundred good deeds, a hundred sins erased, a shield until evening", () => {
      expect(virtue("tahlil-100")).toMatchObject({ collection: "bukhari", number: "6403" });
      has("tahlil-100", "عَدْلَ عَشْرِ رِقَابٍ", "مِائَةُ حَسَنَةٍ", "مِائَةُ سَيِّئَةٍ", "حِرْزًا مِنَ الشَّيْطَانِ", "حَتَّى يُمْسِيَ");
    });

    it("Bukhari 6404: ten times is one slave freed — not four (that is the Muslim wording)", () => {
      expect(virtue("tahlil-10")).toMatchObject({ collection: "bukhari", number: "6404" });
      has("tahlil-10", "مَنْ قَالَ عَشْرًا", "أَعْتَقَ رَقَبَةً", "مِنْ وَلَدِ إِسْمَاعِيلَ");
      expect(skeleton(virtue("tahlil-10").arabic)).not.toContain(skeleton("أَرْبَعَةَ"));
      expect(virtue("tahlil-10").meaning).toMatch(/a slave/);
      expect(virtue("tahlil-10").meaning).not.toMatch(/four/i);
    });

    it("Bukhari 6306: Sayyid al-Istighfar — both the day and the night promise", () => {
      expect(virtue("sayyid-istighfar")).toMatchObject({ collection: "bukhari", number: "6306" });
      has("sayyid-istighfar", "مِنَ النَّهَارِ", "قَبْلَ أَنْ يُمْسِيَ", "مِنَ اللَّيْلِ", "قَبْلَ أَنْ يُصْبِحَ", "مِنْ أَهْلِ الْجَنَّةِ");
      expect(virtue("sayyid-istighfar").meaning).toMatch(/day[^.]*evening[\s\S]*night[^.]*morning/);
    });

    it("Muslim 408: one prayer on him, ten from Allah", () => {
      expect(virtue("salawat-10")).toMatchObject({ collection: "muslim", number: "408" });
      has("salawat-10", "مَنْ صَلَّى عَلَىَّ وَاحِدَةً", "صَلَّى اللَّهُ عَلَيْهِ عَشْرًا");
    });

    it("Muslim 597: after every prayer, 33 + 33 + 33 and the hundred, sins forgiven", () => {
      expect(virtue("after-prayer-33")).toMatchObject({ collection: "muslim", number: "597" });
      has("after-prayer-33", "ثَلاَثًا وَثَلاَثِينَ", "تِسْعَةٌ وَتِسْعُونَ", "تَمَامَ الْمِائَةِ", "غُفِرَتْ خَطَايَاهُ");
    });

    it("Bukhari 5361: before sleep, 33 + 33 + 34, better than a servant", () => {
      expect(virtue("fatima-before-sleep")).toMatchObject({ collection: "bukhari", number: "5361" });
      has("fatima-before-sleep", "فَسَبِّحَا ثَلاَثًا وَثَلاَثِينَ", "وَكَبِّرَا أَرْبَعًا وَثَلاَثِينَ", "خَيْرٌ لَكُمَا مِنْ خَادِمٍ");
    });

    it("Muslim 2709: the scorpion — had you said it in the evening it would not have harmed you", () => {
      expect(virtue("perfect-words-evening")).toMatchObject({ collection: "muslim", number: "2709" });
      has("perfect-words-evening", "حِينَ أَمْسَيْتَ", "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ", "لَمْ تَضُرُّكَ");
    });

    it("Bukhari 5010: Ayat al-Kursi at bedtime — a guardian from Allah, no devil until morning", () => {
      expect(virtue("ayat-kursi-sleep")).toMatchObject({ collection: "bukhari", number: "5010" });
      has("ayat-kursi-sleep", "آيَةَ الْكُرْسِيِّ", "حَافِظٌ", "لاَ يَقْرَبُكَ شَيْطَانٌ", "حَتَّى تُصْبِحَ");
    });

    it("Bukhari 5017 and 5013, Muslim 814: the Quls", () => {
      expect(virtue("sleep-quls")).toMatchObject({ collection: "bukhari", number: "5017" });
      has("sleep-quls", "جَمَعَ كَفَّيْهِ", "ثُمَّ نَفَثَ فِيهِمَا", "مَا اسْتَطَاعَ مِنْ جَسَدِهِ");
      expect(virtue("ikhlas-third")).toMatchObject({ collection: "bukhari", number: "5013" });
      has("ikhlas-third", "لَتَعْدِلُ ثُلُثَ الْقُرْآنِ");
      expect(virtue("muawwidhatayn")).toMatchObject({ collection: "muslim", number: "814" });
    });

    it("Muslim 223, 2137, 2726 and 1884; Bukhari 6570, 6307 and 6384", () => {
      expect(virtue("alhamdulillah-fills-scale")).toMatchObject({ collection: "muslim", number: "223" });
      has("alhamdulillah-fills-scale", "الْحَمْدُ لِلَّهِ تَمْلأُ الْمِيزَانَ");
      expect(virtue("most-beloved-four")).toMatchObject({ collection: "muslim", number: "2137" });
      has("most-beloved-four", "أَحَبُّ الْكَلاَمِ إِلَى اللَّهِ أَرْبَعٌ", "اللَّهُ أَكْبَرُ");
      expect(virtue("juwayriyya")).toMatchObject({ collection: "muslim", number: "2726" });
      has("juwayriyya", "عَدَدَ خَلْقِهِ", "وَرِضَا نَفْسِهِ", "وَزِنَةَ عَرْشِهِ", "وَمِدَادَ كَلِمَاتِهِ");
      expect(virtue("sincere-lailaha")).toMatchObject({ collection: "bukhari", number: "6570" });
      has("sincere-lailaha", "أَسْعَدُ النَّاسِ بِشَفَاعَتِي", "خَالِصًا");
      expect(virtue("istighfar-70")).toMatchObject({ collection: "bukhari", number: "6307" });
      has("istighfar-70", "أَكْثَرَ مِنْ سَبْعِينَ مَرَّةً");
      expect(virtue("la-hawla-treasure")).toMatchObject({ collection: "bukhari", number: "6384" });
      has("la-hawla-treasure", "كَلِمَةٍ هِيَ كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ", "لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ");
      expect(virtue("satisfied-with-allah")).toMatchObject({ collection: "muslim", number: "1884" });
      has("satisfied-with-allah", "رَضِيَ بِاللَّهِ رَبًّا", "وَجَبَتْ لَهُ الْجَنَّةُ");
    });
  });

  it("have an English meaning that agrees with the Arabic on every number", () => {
    const meaning = (id: string) => virtue(id).meaning;
    expect(meaning("subhanallah-bihamdihi-100")).toMatch(/hundred times/);
    expect(meaning("tahlil-100")).toMatch(/hundred times[\s\S]*ten slaves[\s\S]*hundred good deeds[\s\S]*hundred sins/);
    expect(meaning("tahlil-10")).toMatch(/ten times/);
    expect(meaning("salawat-10")).toMatch(/one prayer[\s\S]*ten prayers/);
    expect(meaning("after-prayer-33")).toMatch(/thirty-three[\s\S]*thirty-three[\s\S]*thirty-three[\s\S]*ninety-nine/);
    expect(meaning("fatima-before-sleep")).toMatch(/thirty-three[\s\S]*thirty-three[\s\S]*thirty-four/);
    expect(meaning("istighfar-70")).toMatch(/seventy/);
    expect(meaning("ikhlas-third")).toMatch(/a third of the Qur/);
    expect(meaning("most-beloved-four")).toMatch(/four/);
    expect(meaning("juwayriyya")).toMatch(/four words[\s\S]*three times/);
  });
});

describe("which dhikr a virtue is shown on", () => {
  // Each virtue is about one phrase; the dhikr it is shown on must actually contain that phrase.
  const ABOUT: Record<string, string> = {
    "subhanallah-bihamdihi-100": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    "two-light-words": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    "tahlil-10": "لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ",
    "tahlil-100": "لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ",
    "sayyid-istighfar": "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلاَّ أَنْتَ",
    "satisfied-with-allah": "رَضِيتُ بِاللَّهِ رَبَّاً",
    juwayriyya: "عَدَدَ خَلْقِهِ",
    "istighfar-70": "أَسْتَغْفِرُ اللَّهَ",
    "perfect-words-evening": "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ",
    "salawat-10": "صَلِّ وَسَلِّمْ",
    "sleep-quls": "قُلْ هُوَ اللَّهُ أَحَدٌ",
    "ayat-kursi-sleep": "الْحَيُّ الْقَيُّومُ",
    "fatima-before-sleep": "ثَلاَثاً وَثَلاَثِينَ",
    "after-prayer-33": "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ",
    "ikhlas-third": "قُلْ هُوَ اللَّهُ أَحَدٌ",
    muawwidhatayn: "أَعُوذُ بِرَبِّ الْفَلَقِ",
  };

  it("is an item that exists, and one that contains the phrase the hadith is about", () => {
    for (const [itemId, ids] of Object.entries(ITEM_VIRTUES)) {
      expect(itemText(itemId), `item ${itemId} does not exist`).not.toBe("");
      for (const id of ids) {
        expect(ABOUT[id], `${id} needs an entry in this test`).toBeDefined();
        expect(itemText(itemId), `${id} on item ${itemId}`).toContain(skeleton(ABOUT[id]));
      }
    }
  });

  it("does not put Ayat al-Kursi's bedtime virtue on the morning-and-evening Ayat al-Kursi, or the after-prayer one", () => {
    expect(virtuesForItem("75")).toEqual([]); // morning and evening
    expect(virtuesForItem("71")).toEqual([]); // after the prayer
    expect(virtuesForItem("100").map((v) => v.id)).toEqual(["ayat-kursi-sleep"]); // before sleep
  });

  it("leaves a dhikr without a firmly established virtue without one (e.g. Hasbiyallah seven times)", () => {
    expect(virtuesForItem("83")).toEqual([]);
    expect(virtuesForItem("not-an-item")).toEqual([]);
  });

  it("is used: every virtue is attached to at least one dhikr", () => {
    const used = new Set([...Object.values(ITEM_VIRTUES), ...Object.values(TASBIH_VIRTUES)].flat());
    for (const v of VIRTUES) expect(used.has(v.id), `${v.id} is not shown anywhere`).toBe(true);
  });

  it("refers only to virtues that exist", () => {
    const ids = new Set(VIRTUES.map((v) => v.id));
    for (const list of [...Object.values(ITEM_VIRTUES), ...Object.values(TASBIH_VIRTUES)]) for (const id of list) expect(ids.has(id), id).toBe(true);
  });

  describe("the tasbih", () => {
    const PHRASE: Record<string, string> = {
      subhanallah: "سبحان الله",
      alhamdulillah: "الحمد لله",
      "allahu-akbar": "الله أكبر",
      "la-ilaha-illallah": "لا إله إلا الله",
      astaghfirullah: "أستغفر الله",
      "subhanallah-wa-bihamdihi": "سبحان الله وبحمده",
      "la-hawla": "لا حول ولا قوة إلا بالله",
      salawat: "صل وسلم",
    };

    it("covers phrases that exist", () => {
      const known = new Set(TASBIH_DHIKR.map((d) => d.id));
      for (const id of Object.keys(TASBIH_VIRTUES)) expect(known.has(id), id).toBe(true);
    });

    // The after-prayer hadith names the three acts with verbs — "he glorified Allah (sabbaha), praised Him (hamida), magnified Him (kabbara)" — not the phrases.
    const BY_VERB: Record<string, Record<string, string>> = {
      "after-prayer-33": { subhanallah: "سَبَّحَ اللَّهَ", alhamdulillah: "حَمِدَ اللَّهَ", "allahu-akbar": "كَبَّرَ اللَّهَ" },
      // "Whoever sends blessings upon me…" — the act; the dhikr is the words with which it is done.
      "salawat-10": { salawat: "صَلَّى عَلَىَّ" },
    };

    it("shows a virtue only on a phrase that is part of what the hadith says", () => {
      for (const [dhikrId, ids] of Object.entries(TASBIH_VIRTUES)) {
        for (const id of ids) {
          const needle = skeleton(BY_VERB[id]?.[dhikrId] ?? PHRASE[dhikrId]);
          // The phrase (or its verb) must appear in the Arabic words of the hadith itself.
          expect(skeleton(virtue(id).arabic), `${id} on ${dhikrId}`).toContain(needle);
        }
      }
    });

    it("gives every phrase of the tasbih at least one virtue, in the order they were listed", () => {
      for (const d of TASBIH_DHIKR) expect(virtuesForTasbih(d.id).length, d.id).toBeGreaterThan(0);
      expect(virtuesForTasbih("alhamdulillah").map((v) => v.id)).toEqual(["alhamdulillah-fills-scale", "most-beloved-four", "after-prayer-33"]);
    });
  });
});
