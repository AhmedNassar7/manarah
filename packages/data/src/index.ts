export * from "./calculation-methods.js";

// Quran text (Tanzil Uthmani corpus), the reciter/audio-base-URL table, and the
// default Hisn al-Muslim azkar set are intentionally NOT hardcoded here.
// They must be pulled from their authoritative sources (see the "Data sourcing"
// table in the project plan) via a fetch/build script that writes verified JSON
// into this package — not typed in by hand, to avoid shipping inaccurate
// religious text or a stale/incorrect audio URL as if it were verified data.
