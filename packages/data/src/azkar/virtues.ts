import type { AzkarVirtue } from "@manarah/core";
import virtuesData from "./virtues.json";

/**
 * The virtue (fadl) of a dhikr, for the "Its virtue" dropdown: the Prophet's own
 * words, with the book and number they are in. This is the one place in the app
 * where a mistake would be a mistake about religion, so the rule is strict:
 *
 *  - **Nothing here is typed from memory.** Each entry in virtues.json was found by
 *    searching the actual text of Sahih al-Bukhari or Sahih Muslim (the hadith-api
 *    Arabic editions the Hadith section already uses) and cutting the Prophet's words
 *    out of it, exactly as written there, with the number and book that text gives. A
 *    candidate whose words could not be found was dropped, not "fixed". (The method
 *    caught a real slip on the first run: "whoever says it ten times is as if he freed
 *    four people" is the Muslim wording; Bukhari 6404 says one slave — so only the
 *    wording found in the text is used.)
 *  - **Only Sahih al-Bukhari and Sahih Muslim**, the two books whose every hadith the
 *    community accepts. Plenty of well-loved fadail rest on weaker chains and are
 *    deliberately left out — e.g. "Hasbiyallah ... seven times", whose attribution to
 *    the Prophet is not firmly established. A dhikr with no entry simply has no dropdown.
 *  - A virtue is shown only on the dhikr the hadith is really about. It is not borrowed
 *    for a similar phrase (Ayat al-Kursi has one before sleep, so it is on that list and
 *    not on the morning list).
 *  - Muslim numbers are the usual Fu'ad 'Abd al-Baqi numbers; Bukhari's are the usual
 *    ones. They follow the hadith-api edition the Hadith section reads, so a number here
 *    finds the same hadith there.
 *
 * `meaning` is a plain English rendering of the Arabic shown above it (opt-in, like every
 * translation in the app), kept to what the words say.
 */
const MEANINGS: Record<string, string> = {
  "subhanallah-bihamdihi-100":
    "Whoever says “Subhan Allahi wa bihamdihi” a hundred times in a day, his sins are wiped away, even if they are like the foam of the sea.",
  "two-light-words":
    "Two words, light on the tongue, heavy on the Scale, beloved to the Most Merciful: “Subhan Allahil-‘Azim” and “Subhan Allahi wa bihamdihi”.",
  "tahlil-100":
    "Whoever says “La ilaha illa Allah, alone, with no partner; His is the dominion and His is the praise, and He is able to do all things” a hundred times in a day, it is for him like freeing ten slaves, a hundred good deeds are written for him, a hundred sins are erased from him, and it is a shield for him from Satan that day until evening.",
  "tahlil-10": "Whoever says it ten times is as if he freed a slave from the children of Isma‘il.",
  "sayyid-istighfar":
    "Whoever says it by day with firm faith in it and dies that day before evening is of the people of Paradise; and whoever says it at night with firm faith in it and dies before morning is of the people of Paradise.",
  "istighfar-70": "By Allah, I ask Allah’s forgiveness and turn to Him in repentance more than seventy times a day.",
  "salawat-10": "Whoever sends one prayer upon me, Allah sends ten prayers upon him.",
  "la-hawla-treasure":
    "Shall I guide you to a phrase that is a treasure from the treasures of Paradise? “La hawla wa la quwwata illa billah” (there is no power and no strength except with Allah).",
  "alhamdulillah-fills-scale": "“Alhamdulillah” fills the Scale.",
  "most-beloved-four":
    "The most beloved words to Allah are four: “Subhan Allah”, “Alhamdulillah”, “La ilaha illa Allah” and “Allahu Akbar”. It does not harm you with which of them you begin.",
  "after-prayer-33":
    "Whoever says “Subhan Allah” thirty-three times, “Alhamdulillah” thirty-three times and “Allahu Akbar” thirty-three times after every prayer — that is ninety-nine — and completes the hundred with “La ilaha illa Allah, alone, with no partner; His is the dominion and His is the praise, and He is able to do all things”, his sins are forgiven, even if they are like the foam of the sea.",
  "ikhlas-third": "By the One in Whose Hand is my soul, it (Surat al-Ikhlas, “Qul huwa Allahu ahad”) is equal to a third of the Qur’an.",
  muawwidhatayn:
    "Have you not seen verses that were revealed tonight, the like of which has never been seen: “Qul a‘udhu bi Rabbil-falaq” and “Qul a‘udhu bi Rabbin-nas”?",
  "sleep-quls":
    "Each night, when he went to his bed, he would join his palms together, blow into them, and recite into them “Qul huwa Allahu ahad”, “Qul a‘udhu bi Rabbil-falaq” and “Qul a‘udhu bi Rabbin-nas”, then wipe over as much of his body as he could with them.",
  "ayat-kursi-sleep":
    "When you go to your bed, recite Ayat al-Kursi: a guardian from Allah will stay with you, and no devil will come near you until morning.",
  "satisfied-with-allah": "Whoever is pleased with Allah as Lord, with Islam as religion and with Muhammad as Prophet, Paradise becomes due for him.",
  "perfect-words-evening":
    "A man told the Prophet he had been stung by a scorpion the night before. He said: “Had you said, when evening came, ‘I seek refuge in the perfect words of Allah from the evil of what He created’, it would not have harmed you.”",
  juwayriyya:
    "(To Juwayriyya:) I said four words after you, three times; if they were weighed against what you have said today, they would outweigh it: “Subhan Allahi wa bihamdihi, ‘adada khalqihi, wa rida nafsihi, wa zinata ‘arshihi, wa midada kalimatihi.”",
  "fatima-before-sleep":
    "(To ‘Ali and Fatima:) When you take to your beds, say “Subhan Allah” thirty-three times, “Alhamdulillah” thirty-three times and “Allahu Akbar” thirty-four times: that is better for you than a servant.",
  "sincere-lailaha":
    "The most fortunate of people with my intercession on the Day of Resurrection is the one who says “La ilaha illa Allah” sincerely, from himself.",
};

interface Row {
  id: string;
  collection: "bukhari" | "muslim";
  number: string;
  book: number;
  bookTitle: string;
  bookTitleAr: string;
  arabic: string;
}

export const VIRTUES: AzkarVirtue[] = (virtuesData as Row[]).map((row) => ({ ...row, meaning: MEANINGS[row.id] ?? "" }));

const byId = new Map(VIRTUES.map((v) => [v.id, v]));

/** The Hisn al-Muslim items each virtue belongs to (item id -> virtue ids). Only where the hadith is about that very dhikr. */
export const ITEM_VIRTUES: Record<string, string[]> = {
  // Morning and evening
  "76": ["ikhlas-third", "muawwidhatayn"], // the three Quls
  "79": ["sayyid-istighfar"],
  "87": ["satisfied-with-allah"],
  "91": ["subhanallah-bihamdihi-100", "two-light-words"],
  "92": ["tahlil-10"],
  "93": ["tahlil-100"],
  "94": ["juwayriyya"],
  "96": ["istighfar-70"],
  "97": ["perfect-words-evening"],
  "98": ["salawat-10"],
  // Before sleep
  "99": ["sleep-quls"],
  "100": ["ayat-kursi-sleep"],
  "106": ["fatima-before-sleep"],
  // After the prayer
  "69": ["after-prayer-33"],
};

/** The same for the tasbih's phrases (tasbih dhikr id -> virtue ids). */
export const TASBIH_VIRTUES: Record<string, string[]> = {
  subhanallah: ["most-beloved-four", "after-prayer-33"],
  alhamdulillah: ["alhamdulillah-fills-scale", "most-beloved-four", "after-prayer-33"],
  "allahu-akbar": ["most-beloved-four", "after-prayer-33"],
  "la-ilaha-illallah": ["sincere-lailaha", "most-beloved-four"],
  astaghfirullah: ["istighfar-70"],
  "subhanallah-wa-bihamdihi": ["subhanallah-bihamdihi-100", "two-light-words"],
  "la-hawla": ["la-hawla-treasure"],
  salawat: ["salawat-10"],
};

function pick(ids: string[] | undefined): AzkarVirtue[] {
  return (ids ?? []).map((id) => byId.get(id)).filter((v): v is AzkarVirtue => v !== undefined);
}

/** The virtues of a Hisn al-Muslim item, if it has any. */
export function virtuesForItem(itemId: string): AzkarVirtue[] {
  return pick(ITEM_VIRTUES[itemId]);
}

/** The virtues of a tasbih phrase, if it has any. */
export function virtuesForTasbih(dhikrId: string): AzkarVirtue[] {
  return pick(TASBIH_VIRTUES[dhikrId]);
}
