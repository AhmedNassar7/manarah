import type { HadithCollection, HadithCollectionId, HadithSection } from "@manarah/core";
import sectionsData from "./sections.json";

/**
 * The six canonical collections ("the Six Books"), in their customary order, then the two short ones.
 * Edition ids are the source API's own (fawazahmed0/hadith-api), each checked
 * to exist in both Arabic and English on 2026-11-04. Display names live in
 * the UI dictionaries (`hadith.collection.<id>`).
 */
export const HADITH_COLLECTIONS: HadithCollection[] = [
  { id: "bukhari", arabicEdition: "ara-bukhari", englishEdition: "eng-bukhari" },
  { id: "muslim", arabicEdition: "ara-muslim", englishEdition: "eng-muslim" },
  { id: "abudawud", arabicEdition: "ara-abudawud", englishEdition: "eng-abudawud" },
  { id: "tirmidhi", arabicEdition: "ara-tirmidhi", englishEdition: "eng-tirmidhi" },
  { id: "nasai", arabicEdition: "ara-nasai", englishEdition: "eng-nasai" },
  { id: "ibnmajah", arabicEdition: "ara-ibnmajah", englishEdition: "eng-ibnmajah" },
  // Two short, essential collections: the Forty Hadith of Imam al-Nawawi (42 — all name their source
  // in the text, checked) and the Forty Hadith Qudsi (40 — 39 name their source). One book each
  // (section 1 of the edition); counts taken from the real Arabic and English files on 2026-11-07.
  { id: "nawawi", arabicEdition: "ara-nawawi", englishEdition: "eng-nawawi" },
  { id: "qudsi", arabicEdition: "ara-qudsi", englishEdition: "eng-qudsi" },
];

/**
 * Every book of every collection: number, English title, and hadith count.
 * Generated 2026-11-04 by fetching every book of both the Arabic and English
 * editions (670 files) and recording the real counts — the source's own
 * range metadata is unreliable (Muslim's ranges sum to more than the whole
 * collection) so nothing here is derived from it. All 335 books exist in both
 * editions with identical hadith numbers. Small enough to bundle (~26 KB);
 * the hadith text itself is far too big to bundle and is fetched per book.
 */
const SECTIONS = sectionsData as Record<HadithCollectionId, HadithSection[]>;

export function getHadithSections(collectionId: HadithCollectionId): HadithSection[] {
  return SECTIONS[collectionId] ?? [];
}
