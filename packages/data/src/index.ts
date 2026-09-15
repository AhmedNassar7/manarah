export * from "./calculation-methods.js";
export * from "./quran/index.js";
export * from "./azkar/index.js";
export * from "./cities/index.js";

// The reciter/audio-base-URL table is still intentionally NOT hardcoded here —
// same reasoning the Quran text and azkar set had before they were fetched:
// pull it from its authoritative source via a verified fetch, don't guess.
