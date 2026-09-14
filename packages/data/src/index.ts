export * from "./calculation-methods.js";
export * from "./quran/index.js";

// The reciter/audio-base-URL table and the default Hisn al-Muslim azkar set
// are still intentionally NOT hardcoded here — same reasoning as the Quran
// text had before it was fetched: pull them from their authoritative sources
// via a verified fetch, don't guess at API URLs or type out azkar by hand.
