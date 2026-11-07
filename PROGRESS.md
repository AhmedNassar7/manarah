# Manarah (منارة) — Master Plan & Progress

**Status as of 2026-11-04.** Single source of truth for this project: the full plan (architecture, data sourcing, phased roadmap, testing strategy) *and* what's actually done vs. in progress vs. not started. Lives in the codebase — not in any AI tool's local plan storage — so any contributor, human or LLM, can read it directly. Update this file whenever a plan item's status changes or a decision changes; don't let it drift from reality.

Status markers used throughout: ✅ done &nbsp;·&nbsp; 🚧 in progress &nbsp;·&nbsp; ⬜ not started

Zero-cost constraint, unchanged since day one: **no server, no database, no paid tier, ever.** Static hosting (GitHub Pages) + free public APIs called directly from the client + on-device storage only.

---

## Product framing

One product spanning a Chrome extension (MV3), an installable web PWA, and eventually desktop (Tauri) and mobile (Capacitor), sharing one codebase and one settings/data model — combining what's otherwise scattered across a dozen separate apps: accurate prayer times, a genuinely customizable azkar/dua reminder engine, full Quran text/audio/tafsir, live radio, Qibla, and memorization (hifz) tools.

**Sync**: local-only — IndexedDB (web/desktop/mobile) and `chrome.storage.sync` (extension), plus manual JSON export/import for backup and device-to-device transfer. No accounts, no OAuth, no third-party sync backend. The storage layer (`packages/storage`) is designed so an opt-in sync mechanism could be added later without a rewrite, but it is **not planned** — see "Explicitly deferred" below.

**Framework**: React + Vite + TypeScript, not Next.js — the MV3 extension is a first-class target, not an afterthought, and Vite/CRXJS packages that cleanly; Next's static-export mode would give up most of what Next is for anyway.

---

## Architecture — ✅ done

pnpm workspace monorepo, no Turborepo:

```
/apps
  /web         React+Vite PWA — the full-featured hub (installable, offline-first)
  /extension   MV3 Chrome extension (Vite + CRXJS) — popup, new-tab override, background alarms
  /desktop     Tauri shell wrapping the /web build — system tray, native notifications        ⬜ Phase 2
  /mobile      Capacitor shell wrapping the /web build — native notifications                  ⬜ Phase 2
/packages
  /core        Platform-agnostic domain logic (no DOM/browser globals baked in)
                 - prayer-times: wraps adhan.js, calculation-method presets                     ✅
                 - azkar-engine: schedule model, default Hisn al-Muslim sets, remap/mute/custom-time ✅
                 - quran-data: access layer over bundled Tanzil/AlQuran-Cloud text               ✅
                 - qibla: great-circle bearing/distance math                                     ✅
                 - notifications, badge: pure decision logic for scheduling/toolbar state        ✅
                 - settings: UserSettings model, defaulting/merge logic (withDefaultSettings)    ✅
                 - hijri: Gregorian↔Hijri conversion, events, month grids, Maghrib rule, adjustment   ✅
                 - verse-annotations: per-verse bookmarks/notes model, copy/share text formatting    ✅
                 - tafsir: Quran.com tafsir URL/response parsing, HTML → plain-text blocks, edition choice ✅
                 - word-by-word: Quran.com per-word meaning/transliteration URL + response parsing       ✅
                 - hadith: hadith-api URL fallback chain, response parsing, Arabic/English pairing        ✅
                 - azkar-text: splits a dua's stored string into display parts (words / verse / note / variant) ✅
                 - zakat: nisab/2.5% calculation, forgiving amount parsing (Arabic-Indic digits, EU style) ✅
                 - quran-search: Arabic-skeleton/translation full-text matching, "2:255" references      ✅
  /ui          Shared React components + design system (styles.css) + i18n                       ✅
  /storage     Store interface — IndexedDbStore (Dexie) / ChromeSyncStore + JSON export/import    ✅
  /data        Static bundled assets: Quran text, surah metadata, azkar corpus, GeoNames cities   ✅
```

`apps/*` are thin: they wire `packages/ui` + `packages/core` + `packages/storage` into a platform shell and add platform-specific bits (MV3 manifest + `chrome.alarms`, Tauri notification/tray calls, Capacitor plugins). This is what lets one build target four surfaces without duplicating feature logic.

---

## Data sourcing (all free, all called directly from the client)

| Need | Source | Status | Notes |
|---|---|---|---|
| Prayer times & Qibla | `adhan.js` (Batoul Apps), client-side from Geolocation coords | ✅ done | Pure math, zero network, works fully offline |
| Quran text | Tanzil Uthmani corpus / AlQuran Cloud API, bundled as static JSON in `packages/data`; cross-checked against King Fahd Quran Complex's official Hafs Mushaf (qurancomplex.gov.sa) | ✅ done | All 114 surahs / 6236 verses, offline-guaranteed from first load |
| Translations, tafsir, word-by-word | Quran.com / Quran Foundation API, AlQuran Cloud API | 🚧 One translation (Saheeh International, `en.sahih`) fetched from AlQuran Cloud and wired into the reader; tafsir fetched per verse at runtime (see Tafsir corpus row); word-by-word meaning/transliteration fetched per verse at runtime (Quran.com); further translations not yet fetched | Free, CORS-enabled, no key for most endpoints |
| Word-by-word grammar (root, morphology, syntax) | Quranic Arabic Corpus dataset | ⛔ blocked on license — see reader roadmap step 6 | Purpose-built for a future word-tap grammar feature; word *meanings* shipped from Quran.com instead |
| Verse & surah audio | EveryAyah.com (per-verse) | ✅ per-verse playback done (10 curated reciters) | Direct `<audio>` playback, no proxy; MP3Quran.net per-surah/live-stream radio still unused — see the Radio module, Phase 2 |
| Tafsir corpus | Ibn Kathir, Al-Tabari, Al-Baghawi, Al-Qurtubi, As-Saadi (+ abridged English Ibn Kathir) | ✅ done | Standard Ahl al-Sunnah tafsir canon — all five are on Quran.com's API (`api.quran.com/api/v4/tafsirs/{id}/by_ayah/{s:a}`, resource ids 14/15/94/90/91, English 169), verified live 2026-09-30: CORS `*`, no key. Fetched per verse at runtime (tens of MB total, can't be precached), service-worker CacheFirst so anything read once works offline. altafsir.com fallback not needed |
| Azkar corpus | Hisn al-Muslim (`wafaaelmaandy/Hisn-Muslim-Json`); Al-Adhkar (an-Nawawi) and Saheeh al-Kalim at-Tayyib (Al-Albani) as richer optional packs | ✅ Hisn al-Muslim (266 items) done · ⬜ optional packs Phase 2/3 | Hisn al-Muslim is the standard compact daily-azkar reference every competitor app also uses |
| City search | GeoNames `cities15000.txt` (CC BY 4.0) | ✅ done | Latin-script alternate names extracted for searchability (e.g. "Mecca"/"Medina") |
| Hadith | **hadith-api** (fawazahmed0, Unlicense) via jsDelivr with a GitHub-raw fallback — the six canonical collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah), Arabic + English editions, one book per request | ✅ done (reader roadmap step 9) | Chosen over sunnah.com's API (decided 2026-11-04): that one needs a per-developer key, which a static client-only app can't keep secret. Verified live: CORS `*`, no key, 335 books × 2 editions all present with identical hadith numbers, 0 mismatches. jsDelivr returns HTTP 403 ("package size exceeded") for some `.min.json` files (e.g. eng-bukhari book 6), so the loader falls back minified → full → GitHub raw. Service-worker CacheFirst, so a book read once works offline |
| Hijri calendar | Self-contained tabular/arithmetic conversion in `packages/core/hijri` | ✅ conversion, events and calendar page done | Computed client-side, no network call; arithmetic estimate, ±1-2 days from real moon-sighting-based announcements — not authoritative for determining observances. Spot-checked 2026-11-04: Eid al-Fitr 1447 → 20 Mar 2026 and Eid al-Adha 1447 → 27 May 2026 match the real dates; Ramadan 1447 comes out 18 Feb vs the 19 Feb announced in many countries (hence the user adjustment below) |

## Notifications (all scheduled on-device, no push server anywhere)

| Surface | Mechanism | Status |
|---|---|---|
| Extension | `chrome.alarms` (background service worker, 1-minute tick) → `chrome.notifications` + toolbar badge | ✅ done |
| Web/PWA | Plain `setInterval` while the tab is open → `ServiceWorkerRegistration.showNotification()` (falls back to `new Notification()` if no SW), reusing the same `runNotificationCheck` core logic as the extension | ✅ done — no push server (zero-cost constraint), so it only fires while a tab is open, same caveat as the badge/countdown |
| Desktop (Tauri) | Native OS notification API via Tauri, same locally-computed trigger times | ⬜ Phase 2 |
| Mobile (Capacitor) | `@capacitor/local-notifications`, pre-scheduled daily windows | ⬜ Phase 2 |

**What notifies, and when** (fixed 2026-09-30 — before this, only prayer / post-prayer / morning / custom-time fired, so the Evening, Before-sleep and Waking triggers offered in the azkar settings silently did nothing, Hisn al-Muslim's morning-*and-evening* chapter only ever reminded in the morning, and all text was hard-coded English):

| Notification | When |
|---|---|
| Prayer time | At each of the 5 prayers |
| Azkar after prayer | At each prayer, if any category is on the post-salah trigger |
| Morning azkar (waking + morning + morning-evening categories, one combined notification) | Fajr |
| Evening azkar (evening + morning-evening categories) | Asr — the start of the evening-azkar window |
| Azkar before sleep | 1 hour after Isha, clamped to 23:59 (no bedtime is known; remap a category to a custom time for an exact one) |
| Custom-time azkar | The time set per category in azkar settings |
| Islamic observances | The evening before, at Maghrib (when the Islamic day begins); and again at Fajr on the day for the new year, start of Ramadan and the two Eids — see "Hijri calendar" |

Each fires at most once a day, and anything whose time passed more than 30 minutes ago is marked handled silently rather than delivered — so opening the web app in the evening doesn't dump the whole day's reminders at once. Core's `computeDueNotifications` returns structured, language-neutral `DueNotification`s; `formatNotification` (`@manarah/ui/notifications`, React-free so the extension service worker can import it) renders them in the user's language, with Hisn al-Muslim's Arabic category titles in Arabic. New `"morning-evening"` azkar trigger is category 27's default. Still open (Azkar engine v2, Phase 2): per-prayer on/off, "N minutes before" reminders, snooze.

Orchestration logic that glues a pure decision function to a platform API is refactored so the platform-specific calls are injected as parameters — `runNotificationCheck` / `computeBadgeState` in `packages/core` are the pattern: no direct `chrome.*` or `new Date()` calls inside the decision logic itself, so it's unit-testable with fakes even though the real `chrome.alarms`/`chrome.notifications` firing isn't.

---

## Feature set by phase

### Phase 1 — MVP core — ✅ done

- [x] Prayer times: geolocation + manual city search, calculation-method presets (MWL, ISNA, Umm al-Qura, Egyptian, Karachi, ...), Shafi/Hanafi Asr toggle, countdown widget (with tomorrow's-Fajr rollover), `PrayerSettingsEditor`
- [x] Azkar engine v1: full default Hisn al-Muslim categories with remap/mute/custom-time (`AzkarScheduleEditor`), tally counter with tap-bounce + one-time gold-bloom completion animation
- [x] Quran: full Uthmani text, all 114 surahs, `QuranNavigator` (Surah/Ayah/Juz'/Page tabs with search), batched `QuranReader` (40 verses + "Load more", jump-to-ayah with scroll+highlight), `lastRead` (surah + ayah) tracking/resume to the exact verse, one bundled English translation (Saheeh International) shown per-verse with a show/hide toggle, `QuranAudioPlayer` recitation (10 reciters, repeat/speed, per-verse play button, EveryAyah.com audio), per-verse `VerseActions` toolbar (copy/share/bookmark/note) + `QuranBookmarks` list
- [x] Qibla: pure bearing/distance geometry, two-tone needle compass UI, live device-orientation heading where available, "searching" state, one-time lock + ripple
- [x] Extension: popup (today's prayers + Qibla + continue-reading shortcut to the web Quran reader), `chrome_url_overrides.newtab` (verse of the day + prayer countdown + static compass), background `chrome.alarms`, toolbar badge (minutes-to-next-prayer, teal → henna inside 15 min)
- [x] Web: installable PWA (manual `virtual:pwa-register` + hourly update polling to avoid staleness), offline app shell + offline Quran text, `HashRouter`-based multi-page structure (Home/Prayer/Qibla/Quran/Azkar + persistent `Nav`)
- [x] i18n: English + Arabic throughout (~130+ keys), `LanguageProvider`/`useTranslation()`/`LanguageSwitcher`, `<html lang/dir>` kept in sync for RTL
- [x] Manuscript design system: parchment/indigo-night palette, gold-leaf reserved for completion moments, teal-tile accent, henna for time-critical states, Amiri (Quran-script Arabic) vs. Cairo (UI Arabic), Fraunces + Inter (Latin), CSS-only motion (hover/press feedback, panel open transitions, verse jump-to highlight fade — expanded from the original 3-moment scope on explicit request for a more interactive feel), global `prefers-reduced-motion` kill-switch still the hard ceiling on all of it
- [x] Storage: `Store` interface, `IndexedDbStore` (Dexie, web) / `ChromeSyncStore` (extension), JSON export/import, `withDefaultSettings()` safe-merge helper
- [x] Azkar are Arabic-only by default: `AzkarList` hides the English translation until asked (a Show/Hide translation toggle appears only when the category has one), driven by the same persisted `UserSettings.showTranslation` as the Quran reader and hadith — one choice for all three (fixed 2026-11-05 from a screenshot).
- [x] Navigator surah cards: fixed-height grid cells with a two-line name block (Arabic over transliteration, ellipsized not wrapped) so long names no longer make uneven cards (fixed 2026-11-04 from a screenshot).
- [x] Bundle size: verse text and city list lazy `import()`-loaded per-surah/on-search, keeping PWA precache under Workbox's default 2MB-per-file limit (verified by direct bundle inspection)
- [x] CI: `ci.yml` (typecheck + test + both builds on every push/PR), `deploy-web.yml` (tests gate the Pages deploy)

**Test count**: 1,145 tests passing across all 4 packages (`core` 409, `storage` 17, `data` 150, `ui` 569), as of the last full run. Both `pnpm --filter web build` and `pnpm --filter extension build` succeed cleanly.

### Prayer / Qibla / Azkar polish — ✅ done (2026-09-30, on request)

- [x] **Saved location** — `UserSettings.location` (`SavedLocation`: `source` "gps"|"city", `name`, `countryCode`) now travels with `coordinates`. A city picked by hand is never overwritten by GPS on the next visit (`shouldRefreshLocationFromGps`) — previously every load re-ran geolocation and silently replaced it. GPS fixes are named after the nearest bundled GeoNames city within 50 km (`nearestCity`, on-device, no reverse-geocoding service). `LocationSummary` ("📍 Cairo, Egypt · Chosen by you — saved" + Change → "Use my current location" / city search) replaces the Home-only city search and the old "go to Home" dead end on Prayer and Qibla. Settings saved before this have no `location`, so they're treated as GPS once; re-picking a city pins it.
- [x] **Qibla finder** — full-page `QiblaFinder` on the Qibla route (the compact `QiblaCompass` card stays on Home/extension): large SVG compass rose (N/E/S/W, 5° ticks, north in henna), 🕋 on the rim with a gold line from the centre, and one plain instruction — "Turn right 36°" / "Turn left 34°" / "✓ You're facing the Qibla" with a live heading (`qiblaTurn`, always the shorter way), or "Face 136° — Southeast" without one (`compassPoint`). Live mode turns the rose under a fixed pointer, taking the short way across 359°→0° instead of spinning. "Enable live compass" button where iOS requires a tapped `DeviceOrientationEvent.requestPermission()` — before this, iOS never delivered heading at all.
- [x] **Azkar sections** — the Azkar page showed only category 27 (morning/evening) out of 132. `AzkarBrowser` now organises all of Hisn al-Muslim into 13 themed sections (`AZKAR_SECTIONS` in `packages/data`: morning & evening, sleep, prayer, wudu & mosque, home & clothing, food & fasting, travel, distress & protection, illness & funerals, weather & nature, family & social, Hajj & Umrah, dhikr & forgiveness) with section tabs, per-section category cards, and a search across all category titles in English or Arabic (harakat-insensitive). Every category with content is in exactly one section (data test). Categories now carry `nameArabic` from hisnmuslim.com's own Arabic index (same 132 ids, verified one-to-one), shown in the Arabic UI in the browser, the list heading, and the schedule editor. The 132-row schedule editor is collapsed under a `<details>` so it no longer buries the azkar.

### Phase 2 — Growth — ⬜ not started

- [ ] Azkar engine v2: richer customization (per-category remap to any time/trigger, custom dua playlists, notification style choice, snooze)
- [x] Radio module: live Quran stations (172, from MP3Quran.net's catalogue incl. Saudi Quran Radio), keeps playing across pages, lock-screen controls — ✅ done 2026-11-07 (web; see "Radio" below). *Not in the extension yet.*
- [ ] Memorization mode: mic-based recitation tracking via `MediaRecorder`/`SpeechRecognition` (free/on-device, no paid speech service), hide/reveal verses, hifz progress dashboard
- [ ] Multi-translation library, offline audio downloads cached in IndexedDB *(multi-tafsir: ✅ done via reader roadmap step 5 — Jalalayn isn't on Quran.com's API, so not included)*
- [ ] Desktop: Tauri build wired up, system tray + native azan notifications
- [ ] Mobile: Capacitor build wired up, native notifications + home-screen install polish

### Phase 3 — Depth — ⬜ not started

- [x] Hadith library — browse the six collections book by book, Arabic-first with opt-in English and attributed gradings (see reader roadmap step 9). Still open: search, bookmarks/notes, cross-links from tafsir
- [x] Hijri calendar page (month grid, observances, coming events, ±2-day adjustment) — see "Hijri calendar" below. Holiday reminders are done too (see below), and so is the Zakat calculator (see "Zakat calculator"). Still open: Qada/fasting tracker
- [ ] Khatmah (completion) reading-plan generator
- [ ] AR/camera-assisted Qibla on mobile

### Explicitly deferred / optional — not part of the build

- GitHub Gist or Firebase/Supabase-based cross-device sync — breaks the zero-server constraint's spirit; storage layer allows it later without a rewrite, but not planned
- Any social/community feed — keeps the product lean against Muslim Pro-style bloat
- Native App Store/Play Store listings — PWA + Capacitor sideload/Chrome Web Store cover "mobile"/"extension" without the $99/yr + $25 store fees; revisit only if official store listings are explicitly wanted later
- Three-column desktop reader layout (index / page / marginalia) + "immersive reader" mode that hides chrome on scroll — real layout restructuring, not a styling tweak
- Framer Motion / Rive — deliberately staying CSS-only; revisit only if a specific interaction genuinely can't be done in CSS
- ~~Prayer-time-driven ambient background gradient~~ — built 2026-11-05 as the Home/Prayer hero (see "Joy layer"); extending it to the page background is still open
- Full hand-drawn geometric icon set (rub el-hizb/star motifs) for *every* glyph — superseded by the "Iconography" section above (vendored generic icons + 5 custom domain icons); an optional rub el-hizb star at hizb-quarter boundaries in the reader is still open
- Sound effects (tasbih click, completion chime) — needs asset sourcing + an audio-preference setting
- Native mobile widgets (iOS Live Activities / Android Dynamic Island) — needs a native Capacitor target, reopens the store-fee question above
- KFGQPC Uthmanic Script HAFS font — no verified, licensed, freely-linkable source found; Amiri is the substitute, not expected to change without a real source turning up

---

## Quran reader parity roadmap

Started after reviewing Quran.com, Sunnah.com, and corpus.quran.com in detail — the goal is a reader that matches their depth and interaction quality (audio, per-word detail, tafsir, notes, every navigation mode), not just their data. Ordered by dependency: each item mostly builds on the one before it. Supersedes the scattered Quran-related bullets in Phase 2/3 below — those still show status, but this is the authoritative build order.

1. [x] **Translation display** — one bundled edition (Saheeh International), show/hide toggle in `QuranReader`. *(Multi-edition selection is still open — see Phase 2 list.)*
2. [x] **Navigation overhaul** — `QuranNavigator`: tabbed Surah/Ayah/Juz'/Page picker with search, replacing the old surah-only list; per-verse `focusAyah` jump-and-highlight in `QuranReader`; juz'/page/manzil/ruku'/sajdah metadata (`packages/data/quran/metadata.json`, sourced free from the same AlQuran Cloud response as the translation).
3. [x] **Audio recitation player** — `QuranAudioPlayer`: 11 curated reciters (see "Reciters, reading styles and translation audio" for styles and translation audio), play/pause/prev/next, repeat count (1/2/3/5×), speed (0.75–2×), auto-scroll + persistent highlight for the playing verse (`QuranReader`'s new `playingAyah`), per-verse play button. Built entirely on EveryAyah.com per-verse files (no surah-wide file + timestamp sync needed) — every reciter folder name and the URL pattern verified live before use, not guessed.
4. [x] **Per-verse action toolbar + notes/bookmarks** — a ⋯ button under each verse's play button opens `VerseActions` (one verse at a time): Copy and Share (Web Share API, button hidden where unsupported) of the verse text + visible translation + a "(Surah s:a)" citation, Bookmark toggle, and an inline personal-note editor. Bookmarked verses get a teal inline-start edge; notes render under the verse. `QuranBookmarks` on the Quran page lists every bookmark/note in mushaf order and jumps to it. Pure model in `packages/core/verse-annotations` (`toggleBookmark`/`setNote`/`listAnnotations`/`formatVerseForSharing`, injected `now`, empty entries pruned), persisted through the existing `Store` interface under one key (`manarah:verse-annotations`) — no new table needed, and it's covered by JSON export/import automatically. Web only for now: the extension has no reader, and a single key would hit `chrome.storage.sync`'s 8KB per-item limit at a few hundred notes if it's ever synced there.
5. [x] **Tafsir panel** — a "Tafsir" action in the verse toolbar opens `TafsirPanel` inline under that verse (stays open when the toolbar closes; one verse at a time): source picker across all six editions (choice persisted as `UserSettings.tafsirEditionId`; unset → first edition in the UI language, so English readers default to the abridged English Ibn Kathir), loading / error-with-retry / "no separate commentary" states, a "Commentary on verses a–b" note when the source treats a passage as one unit (real: English Ibn Kathir returns 114:1–6 as one entry), bounded scroll box (al-Tabari on 2:255 is ~57k chars). The API's HTML is flattened to plain heading/paragraph blocks in `packages/core/tafsir` and rendered as text — no `dangerouslySetInnerHTML`, so nothing from the API can inject markup. Fetching lives in `apps/web/src/tafsir.ts` (session cache that evicts failures so Retry really retries) and is injected into the UI, keeping `packages/ui` platform-agnostic. Known limitation: al-Qurtubi and as-Sa'di come from the API with no paragraph markup at all, so they render as one long block — same as on Quran.com; not heuristically split.
6. 🚧 **Word-by-word** — split into two halves after the license check (decided 2026-09-30):
   - [x] **Meaning + transliteration** — a "Word by word" action in the verse toolbar opens `WordByWordPanel` inline under the verse: every word as a card (Uthmani word in Amiri, transliteration, English meaning), flowing right-to-left in reading order; loading / error-with-retry states; independent of the tafsir panel, so both can be open at once. Fetched per verse from Quran.com (`/api/v4/verses/by_key/{s:a}?words=true&word_fields=text_uthmani`, verified live: CORS `*`, no key; the verse-end number marker the API mixes in is filtered out), through the same `apps/web/src/quran-com.ts` cached loader as tafsir, with its own service-worker CacheFirst cache. Shown as a separate word list rather than making the verse's own words tappable: Quran.com's word segmentation/spelling isn't guaranteed to line up one-to-one with the bundled AlQuran Cloud text (e.g. tatweel differences), and a misaligned word→meaning mapping on scripture is worse than none. English meanings only for now (Quran.com has other `word_translation_language`s).
   - [ ] **Roots / morphology / grammar** — ⛔ **blocked on licensing, needs an explicit decision before any work.** The Quranic Arabic Corpus (corpus.quran.com, v0.4) is "GNU General Public License" *plus* its own terms: "copy and distribute verbatim copies of this file, but CHANGING IT IS NOT ALLOWED", source must be credited with a link to corpus.quran.com, and the copyright notice kept. Converting it into this project's JSON shape arguably counts as changing it; bundling GPL data into an app that has no license of its own raises copyleft questions; and the download is gated behind submitting a contact email. Quran.com's public API doesn't expose root/lemma/morphology (requested `word_fields=root,lemma,stem` are silently ignored). Options if revisited: ship the corpus file verbatim and parse it at runtime (with credit + link), after deciding the project's own license; or find another source with clear terms.
7. [x] **Full-text search** — `QuranSearch` on the Quran page (between the navigator and bookmarks): search-as-you-type over all 6236 verses, results as a bounded scrolling list (surah · verse, Arabic, translation) with the matched text `<mark>`-highlighted, "Show more" in pages of 50 with a total count; choosing a result jumps the reader there. Distinct from the navigator's number/surah-name search. Pure matching lives in `packages/core/quran-search`; `searchQuran` in `packages/data` lazy-loads verses + translation and builds the in-memory index on first use (tens of ms; later keystrokes are plain substring scans), and `QuranSearch` takes the search function by injection like tafsir/word-by-word do.
   - **Arabic**: an Arabic-script query searches the Arabic text, without needing harakat. Both sides are folded to a bare skeleton (harakat, Quranic annotation marks and tatweel dropped; alef wasla/hamza-alef → alef, alef maqsura → ya, ta marbuta → ha, hamza-on-waw/ya folded, Persian kaf/ya accepted). The dagger alef is ambiguous — ٱلرَّحْمَٰنِ is typed "الرحمن" but ٱلْعَٰلَمِينَ is typed "العالمين" — so each verse is indexed both with and without it and a term matches either way. Highlights map back onto the original vocalised text (a highlighted word keeps its harakat).
   - **Everything else** searches the English translation (case/accent/punctuation-insensitive; apostrophes dropped so "Abraham's" finds "Abraham"). Multi-word queries need every word, in any order, as substrings ("رحم" finds "الرحمن"); queries under 2 letters return nothing. Hits are in mushaf order, not relevance order.
   - **`2:255`-style queries** are a jump, not a search (validated against real verse counts; out-of-range falls through to a normal search).
   - Known limits: no root/lemma search (needs the blocked morphology data from step 6 — "الله" won't find "لِلَّهِ"); no phrase-adjacency or relevance ranking; translation search covers the one bundled edition only; web only (the extension has no reader).
8. 🚧 **Reading settings panel** — scoped down on 2026-11-04 to what the app can support today. `ReadingSettings` (collapsed panel above the reader on the Quran page) consolidates:
   - [x] **Text size** — five steps (85%–185%, `READER_FONT_SCALES` in `packages/core/settings`) applied to both the Arabic and the translation via a `--reader-scale` CSS variable on the reader; `UserSettings.readerFontStep`, clamped on read (`clampReaderFontStep`) so a hand-edited import can't break the reader.
   - [x] **Show/hide translation** — now persisted (`UserSettings.showTranslation`) instead of resetting every session, and **off by default** (changed 2026-11-04 on request: the reader opens Arabic-only, translation is opt-in; existing users with no saved value get the new default); the reader's own toggle and the panel's checkbox drive the same state (`QuranReader`'s `showTranslation`/`onShowTranslationChange` are optional controlled props, so it still works standalone).
   - [x] **Default reciter** — the same `UserSettings.reciterId` the audio player uses; both pickers stay in sync.
   - [ ] **Translation edition choice** — nothing to choose between yet (one bundled edition); belongs with Phase 2 multi-translation.
   - [ ] **Script style (Uthmani / IndoPak)** — ⛔ needs a verified IndoPak text source *and* a licensed IndoPak web font; neither has been found, and per the working conventions neither is to be guessed. Revisit only if real sources turn up. Web only for now, like the rest of the reader.
9. [x] **Hadith library** — new `/hadith` route (and nav/Home entry): `HadithBrowser` with a tab per collection, a filterable list of books (English title + verified hadith count), then the hadith cards of one book — Arabic in Amiri, English translation opt-in (it reuses the same `UserSettings.showTranslation`, Arabic-only by default, as the Quran reader), copy/share with a citation, and each scholar's grading shown *attributed* ("Al-Albani: Hasan Sahih") only where the source publishes one — the app never states a verdict of its own. Long books reveal in batches of 25; load errors offer a real retry; a slow response for a book you already left is ignored. Pure parsing/pairing/URLs in `packages/core/hadith`; collections + the bundled book index (`sections.json`, ~26 KB, counts taken from the real files because the source's own range metadata is wrong — Muslim's ranges sum to more than the whole collection) in `packages/data/hadith`; the fetch loader in `apps/web/src/hadith-api.ts`.
   - Known limits: **no hadith search yet** (the plan's natural next increment — needs either a per-collection search index or fetching books on demand); no bookmarks/notes for hadith and no cross-link from the tafsir panel; book titles are shown in the interface language — Arabic titles were added later (see "Arabic means Arabic" below); the app doesn't remember which book you were reading across navigation; hadith numbering follows the source edition (Muslim's printed numbers such as "8.01" are shown as given) and can differ from printed editions — the page says so.
   - **Open licensing question:** the dataset is Unlicense, but the English translations (Muhsin Khan for Bukhari, Abdul Hamid Siddiqui for Muslim, others unattributed in the source) are the translators' works; the page credits the dataset, not each translator. Worth a decision before any public release, alongside the project's own licence (see step 6).
   - Web only for now, like the rest of the reader.

**Reviewed but not queued — conflicts with this project's own constraints, flagged rather than silently dropped:**
- **QuranReflect.com-style reflections/notes sharing** — a social/community feed, which the "Explicitly deferred" list below already rules out to stay lean.
- **Quran.AI-style assistant** — needs a hosted LLM backend; conflicts with the zero-server/zero-cost constraint that's been unchanged since day one. Would need its own explicit decision to add a paid/hosted dependency before any work starts here.

---

## Iconography — ✅ done (planned and built 2026-11-04)

**Why (the audit that started it).** Every icon was an emoji or a text glyph typed straight into JSX or the i18n dictionaries, and the only real SVGs are the logo and the Qibla compass. Audit of what's there:

| Where | Today | Problem |
|---|---|---|
| Nav + Home tiles | 🏠 🕌 🧭 📖 📿 | Colour emoji render differently per OS (Segoe / Apple / Noto), ignore the parchment palette and dark mode, can't take `currentColor`, hover/active tint, or the teal accent |
| Audio player | ⏮ ▶ ⏸ ⏭ ⏹ | Text glyphs, not icons: font-dependent size and baseline, and iOS silently swaps ▶ and ⏸ for emoji-style images |
| Reader / panels | ▶ ⋯ × ⌄ A− | Same; `×` and `−` are typographic characters, not matched to anything else |
| Verse toolbar | text-only buttons (Copy, Share, Bookmark, Tafsir, Word by word, Note) | Eight words to scan; no visual anchor, no bookmarked-state glyph |
| Qibla / location | 🕋 inside i18n strings, 📍, 📡 | Can't be styled or replaced; baked into translated sentences |
| Directional arrows | `←` / `→` swapped by hand for Arabic, ↻ ↺ for turn direction | Per-call RTL special-casing |

**Recommendation: one in-house SVG icon set, no emoji in the UI chrome.** A single `<Icon name="…" />` component in `packages/ui/src/icons/`, inline SVG (so no extra requests and it works offline in the PWA and the extension), 24×24 grid, 1.75 stroke, round caps/joins, `currentColor` everywhere. No new runtime dependency (consistent with the working conventions): generic UI glyphs are vendored path data from Lucide (ISC licence — attribution kept in a NOTICE file), and the ~6 domain icons that no library has are drawn by hand on the same grid and stroke so the two halves read as one family. This also delivers the deferred "hand-drawn geometric icon set" item, scoped to what's needed rather than a full illustration project.

**Rules (so it matches the existing design system).**
- Colour comes from the surrounding text colour: muted at rest, `--accent` on hover/active/pressed. **Gold stays reserved for completion moments and the ayah-end ornament** — a bookmarked verse is a filled *teal* bookmark, never gold, same as the existing teal edge.
- Sizes 16 / 20 / 24 only (inline in text / buttons / nav). Icon-only buttons keep their `aria-label`; icons beside a visible label are `aria-hidden`.
- Directional icons (arrow, chevron, back) carry a class that mirrors under `[dir="rtl"]` — replaces the hand-swapped `←`/`→`. Media controls (play/skip) do **not** mirror, as in every audio UI.
- Motion reuses what's already there: 120 ms `--ease-quiet` tint/press feedback, play⇄pause crossfade, bookmark fill; the global `prefers-reduced-motion` kill-switch still applies.
- Emoji disappear from all UI strings. Sentences that referenced one (`🕋 reaches the pointer`) are reworded to name the thing ("the Kaaba marker"), and the Kaaba marker on the compass becomes a drawn SVG element.

**Icon map.** *Custom* = hand-drawn on the shared grid; *Lucide* = vendored path (exact icon names confirmed at implementation).

| Place | Icon | Source | Notes |
|---|---|---|---|
| Nav / Home: Home | `home` | Lucide | |
| Nav / Home: Prayer | `mosque` | Custom | dome + minaret + crescent finial — echoes the logo's tower |
| Nav / Home: Qibla | `qibla` | Custom | compass ring with a small Kaaba cube at the needle tip (Lucide `compass` as fallback) |
| Nav / Home: Quran | `quran` | Custom | open book on a rehal (stand) with a small eight-point star |
| Nav / Home: Azkar | `tasbih` | Custom | loop of beads with the end tassel — clearer than 📿 and no emoji skin tones |
| Audio player | `play` `pause` `stop` `skip-back` `skip-forward` `repeat` `gauge` (speed) | Lucide | per-verse play button is the same `play` at 16 px |
| Reader controls | `more` (⋯), `x`, `chevron-down` | Lucide | |
| Verse toolbar (icon **+** label) | `copy` → `check` on success, `share`, `bookmark` (filled when set), `book-open-text` (tafsir), `whole-word` (word by word), `pen-line` (note) | Lucide | keeps the words (they're what makes it learnable), adds the glyph as the scan target |
| Reading settings | `sliders` (panel), `a-arrow-down` / `a-arrow-up` (text size), `mic` (reciter) | Lucide | replaces `A−` / `A+` |
| Search | `search` | Lucide | leading icon inside the search box; `arrow-right` (mirrored) on the "Go to 2:255" row |
| Location | `map-pin`, `locate` (use my location) | Lucide | replaces 📍 / 📡 |
| Qibla finder | `rotate-cw` / `rotate-ccw` (turn hint), `check` (facing) | Lucide | replaces ↻ ↺ ✓ |
| Notification prompt | `bell` | Lucide | |
| Ayah-end marker | keep the existing `﴿n﴾` gold ornament | — | already the right convention; optional later: rub el-hizb star at hizb-quarter boundaries (needs the metadata we already have) |
| Brand (favicon, PWA, extension, notification PNG) | unchanged | — | already generated from `assets/logo.svg` |

**As built.** `<Icon name="…" />` in `packages/ui/src/icons/` (plus `IconInSvg` for drawing one inside an existing `<svg>`, used for the Kaaba marker on the Qibla dial, and `isIconName` for names that arrive as strings from data). 40 icons: 31 generic ones vendored as plain path data from lucide-static 0.468.0 by a generator script (`lucide.ts` is marked generated; ISC licence in `/NOTICE`) and 5 hand-drawn domain icons in `custom.ts` — `mosque`, `kaaba` (a cube in slight perspective with band and door), `qibla` (ring open at the top where a small Kaaba sits, plus a pointer), `quran` (open book on a rehal), `tasbih`. The custom ones were rasterised and inspected at 96/48/24/16 px and redrawn twice (the first Kaaba read as a window and the first Qibla needle as the letter "A"). The Quran icon has no star — it didn't survive 16 px. Where it's used: nav and Home tiles (Home tiles scale the 24 px icon to 32 px with a lighter stroke), audio player (media icons filled), reader play/more, navigator/panel close, reading-settings text size, search box, location pin / "use my location", Qibla finder (turn arrows, "facing" check, and the Kaaba marker, counter-rotated so it stays upright as the dial turns), Azkar back button (mirrors in RTL), verse toolbar (icon + label, bookmark filled when set), notification prompt, and the 13 azkar section icons (data's `AzkarSection.icon` is now an icon name, not an emoji). Directional icons flip in RTL via `:dir(rtl)`; media icons never do. Translated strings no longer contain emoji or arrows; sentences that mentioned 🕋 now say "the Kaaba marker".

**Guard.** `icons/no-emoji.test.ts` fails the build if any emoji, arrow, media or geometric symbol appears in UI, web, extension, data or core source (comments excluded) — it already caught the 13 azkar-section emoji in `packages/data` that the original audit missed. Built web and extension bundles were also scanned: zero emoji left.

**Not verified in a real browser** (none available here, as ever): the contact sheet of the custom icons was rendered with resvg, but nav/Home/player alignment is checked only by CSS inspection and tests. Screenshots remain the real check; the most likely tweaks are icon size/weight in the nav and verse toolbar.

**Build order** (each step shippable on its own):
1. ✅ **Foundation** — `Icon` component + registry, `.icon` CSS (sizes, `currentColor`, RTL mirror class), registry test (every name resolves, every path has a `viewBox`), NOTICE for Lucide.
2. ✅ **Domain icons** — draw `mosque`, `qibla`, `quran`, `tasbih` (+ the Kaaba marker in `QiblaCompass`/`QiblaFinder`), review each at 16/20/24 in light and dark.
3. ✅ **Chrome swap** — Nav, Home tiles, audio player, reader buttons, navigator/panel close, reading-settings stepper, search box.
4. ✅ **Verse toolbar** — icon + label buttons, filled-bookmark state.
5. ✅ **i18n clean-up** — remove emoji/arrow characters from dictionary strings, reword the hints; guard test that fails if any UI source or dictionary contains an emoji (small allow-list for the Quranic ornament characters).

**Open choices (recommendation in bold).** Nav on phones: **icon over a small label** (current layout) vs icon-only. Icon source: **vendored Lucide + custom domain icons** vs all-custom (more work, more distinctive, harder to keep consistent). Emoji anywhere at all: **none in the UI**; system notification text stays plain text.

---

## Hijri calendar — ✅ done (2026-11-04)

New `/calendar` route (nav + Home tile) and a "today" line on Home. `HijriCalendar` (`packages/ui`) is a month grid — Hijri day large, Gregorian date small — with month navigation (year rolls over), "back to today", this month's observances, the next four events with "in N days", and a ±2-day adjustment stepper. Persisted as `UserSettings.hijriAdjustment` (clamped on read).

Correctness points that are easy to get wrong, all unit-tested in `packages/core/hijri`:
- **Local date, not UTC date** — `toCalendarDate` reads the local year/month/day, so late evening doesn't show tomorrow's Hijri date in zones behind UTC.
- **The Islamic day begins at sunset** — from today's Maghrib the Hijri date is already tomorrow's (`currentHijriDate`). The Maghrib passed in is ignored unless it belongs to today, so a tab left open past midnight can't treat yesterday's Maghrib as already passed.
- **Adjustment** — shifts every date by up to ±2 days to match the local moon-sighting announcement; a later Hijri date means an earlier civil one, and the month grid and "today" agree under any adjustment.
- **Observances** — Islamic New Year, Tasu'a, Ashura, first of Ramadan, Eid al-Fitr, Day of Arafah, Eid al-Adha, plus the **White Days** (13th–15th of every month, recommended fast) — *excluding 13 Dhu al-Hijjah*, a day of Tashreeq on which fasting is forbidden. Fast-recommended entries say so in their name; Eid days get a filled tile.
- Always labelled as calculated, not sighted, with a prompt to confirm Ramadan/Eid with the local authority.

**Reminders (added 2026-11-05).** New `observance` notification type in `packages/core/notifications`, so it runs through the same `runNotificationCheck` on every platform (extension alarms, web tab loop) and is rendered by `formatNotification` in English and Arabic.
- **When:** the *evening before*, at Maghrib — the Islamic day has just begun and the fast or celebration falls on the coming civil day, which is when you need to know to intend a fast and eat suhoor. Dates worth a second nudge (Islamic New Year, start of Ramadan, both Eids) also get one at Fajr on the day, with "Eid Mubarak" on the Eids. Everything else (Tasu'a, Ashura, Day of Arafah, White Days) is evening-before only. The table is `OBSERVANCE_REMINDER_POLICY`, and a test pins it to the event list so a new event can't be added without a decision.
- **White Days: one reminder per block, not three** — only the evening before the 13th (or the 14th in Dhu al-Hijjah, where the 13th is Tashreeq).
- Follows the user's Hijri adjustment; uses the same fire-once-a-day bookkeeping (`NotificationState.firedObservances`, upgraded from older saved state) and the same 30-minute staleness rule as every other notification, so opening the app late never dumps old reminders.
- Wording says "by the calculated calendar — confirm with your local announcement", never asserting a sighted date.
- One switch (`UserSettings.observanceReminders`, default on, effective only once notification permission is granted) on the Calendar page. Like every web notification here, it only fires while a tab (or the extension) is running — there is no push server.

Known limits: no Laylat al-Qadr marking (its date is a matter of scholarly difference — deliberately not asserted); week starts Sunday in English and Saturday in Arabic with no separate setting; the layout has only been checked by tests and CSS inspection, not on screen.

## Zakat calculator — ✅ done (2026-11-05)

New `/zakat` route (nav + Home tile). `ZakatCalculator` (`packages/ui`) takes what you own (cash/savings, gold by weight and karat, silver by weight, investments, business goods, money owed to you, other), what you owe that's due now, today's gold and silver prices, and a nisab basis; it shows the nisab, net wealth, whether zakat is due, and 2.5% of net wealth if so — with the working beneath the verdict. Pure arithmetic in `packages/core/zakat`; the form is saved on-device only under `manarah:zakat` (covered by JSON export, which dumps the whole store) and "Clear amounts" resets it while keeping currency and basis.

Decisions worth knowing:
- **Prices: superseded by v2 below** (live prices, automatic by default). The original decision was manual entry only — a bundled price would be silently wrong within weeks — and manual entry is still there as a mode.
- **Nisab basis is the user's choice, never silently picked** — default silver (595 g, the lower threshold) or gold (85 g); the UI says scholars differ. A note mentions the slightly higher Hanafi weights (87.48 g / 612.36 g).
- **Jewelry** is not decided for the user: a note states the Hanafi view (counted) and the Shafi'i/Maliki/Hanbali view (exempt) and says to enter its weight only if you follow a view that counts it.
- **Combined wealth reaches the nisab together** (e.g. 5 g gold + cash), as the rule intends; zakat is 2.5% of *all* net wealth once over, not of the excess; exactly at the nisab counts as due. Gold is valued as pure gold (weight × karat ÷ 24).
- **Amount parsing errs on the side of not understating wealth.** `parseAmount` reads Arabic-Indic/Persian digits and separators, `1,250.50` and `1.250,50`; and for *money* fields a dot-grouped value such as `1.250` is read as 1,250 (a European thousands separator), not 1.25. Grams and per-gram prices are parsed separately, where a dot is always a decimal (`10.500` g, a silver price of `0.855`). Invalid text is flagged on the field and counted as 0 with a visible warning — never silently.
- **Honest limits stated on the page:** the app can't know whether a full lunar year (hawl) has passed; shares held long-term are a matter of scholarly difference; "this is a guide, not a fatwa".

Known limits: one gold entry (single karat) and one silver entry — someone holding several karats must convert to one; no per-category breakdown of which assets are exempt; zakat on agricultural produce, livestock and mining is out of scope; no reminder for the user's own zakat date (a natural pairing with the Hijri calendar and observance reminders).

## Responsive layout — ✅ done (2026-11-05, from a user screenshot)

The web app was a single 720px column, so on a wide screen both sides sat empty, and with eight sections the nav had started wrapping into two rows. Now (all CSS in `styles.css` under "Responsive layout", verified by screenshots):
- **900px and up — sidebar layout.** The nav becomes a sticky vertical sidebar beside a wide content area (shell up to 1360px). It's a CSS grid, so in Arabic the sidebar moves to the right on its own — no RTL special-casing. Home's quick-link tiles are hidden here (the sidebar already links every section) and show on phones only.
- **1200px and up — two-column pages** (`.page-split`): Prayer (countdown + timetable | settings), Calendar (month grid | this month / coming up / adjustment / reminders), Zakat (inputs | sticky result and notes), Quran (`.quran-layout`: a sticky tools column — navigator, search, reading settings, bookmarks — beside the reader and audio player). Below 1200px these stack as before.
- **Reading text keeps a comfortable measure** (`.hadith-reader`, `.azkar-list` capped at 880px) instead of spanning the whole content area; the Hadith book list, being a grid, simply gains columns.
- **Phones (under 900px)** keep one column; the nav is a single horizontally scrollable strip (no wrapping rows). 640–899px gets a wider (860px) shell.
- **Azkar section tabs** wrap on desktop instead of scrolling sideways; **the Quran search placeholder** was shortened to fit the narrower tools column.
- New **`PrayerTimesList`** — today's full timetable (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) with the next prayer highlighted, on Home (stacked under the countdown, beside the compass) and on the Prayer page. The dictionary already had every name and "Today's prayers"; the component was simply never built, which left the Prayer page showing only a countdown.
- Only `.app-shell` is restyled; the extension, which reuses `.app-header` only, is untouched.

Recommended next for phones (not done): a bottom tab bar with the four or five most-used sections plus a "More" sheet is the standard mobile pattern and beats a scrolling strip for reach — the strip is the cheap fix; the tab bar is the better one.

## Azkar text structure — ✅ done (2026-11-05, from a user screenshot)

**The problem.** Each dua is one string in the source (Hisn al-Muslim, hisnmuslim.com — its own API serves it identically), so the riding dua showed as a single run-together block: the opening words, a Quranic verse and the closing praise fused, with the source's printed-book markers (`((`, `))`) showing as stray punctuation (and mirrored in RTL). The `((` are not a mistake: they are that book's convention. Researched against reference platforms — one editions page splits this same dua into "1/3, 2/3, 3/3" (opening words, the verse in ﴿ ﴾, the closing praise), another prints it as one run-on block like we did; the split form is the better reading experience.

**The source's conventions** (audited across all 266 entries): `((…))` wraps the words to say (237 entries); `﴿…﴾` a Quranic verse (16), with `*` between its verses; `(…)` an instruction such as "(three times)"; `[…]` an alternative wording, usually the evening version of a morning dua. Text outside any marker is *not* reliably an instruction — the opening "أعوذ بالله من الشيطان الرجيم" of Ayat al-Kursi sits outside, and is recited — so parts are classified by content, not just by position.

**The fix** is presentation-only; the stored data is untouched, so it stays faithful to its source and re-syncable. `parseAzkarText` (`packages/core/azkar-text`) returns typed parts, and `AzkarList` renders each on its own:
- **dua** — the words to say, prominent.
- **quran** — a verse: Amiri (the Quran face), teal, in a quiet tinted block between gold ﴿ ﴾ brackets, with the source's `*` replaced by the gold verse-end ornament ۝.
- **note** — an instruction or introduction ("(three times)", "The Prophet ﷺ said:"): smaller and muted — context, not recitation.
- **variant** — an alternative wording (the evening version): its own block with an accent rule. Each bracketed group is its own part, wherever it sits.
- One tally per dua, as in the source — the parts are visual, the count is not per part. The English translation (still opt-in) is split by `splitAzkarTranslation` along the same printed-book groups, with the wrapping parentheses removed and "(three times)" kept; it is not aligned part-for-part with the Arabic, because the two aren't reliably one-to-one.
- Tolerates the source's real mess: unbalanced and nested `((`, stray `))`, one unclosed `﴿`, groups of `(…)` containing a verse (each surah with its basmala).

**Guarantee.** `packages/data/src/azkar/text.test.ts` runs the parser over every real entry and proves: not one letter or diacritic is lost or invented (the parts together are exactly the original text), no source marker survives in displayed text, every `﴿…﴾` becomes a verse part, and every translation keeps every word. This caught a real bug during the work — a regex whose `\b` had been turned into invisible backspace characters by my own scripting — which the repo was then scanned for.

Known limits: a few rare entries keep a short instruction inside the dua it introduces (e.g. "يجمع كفيه … فيقرأ فيهما:" runs into the basmala after it; the Hajj narrations are broken into note/dua/note but stay long); the heuristics for what counts as an instruction are tuned to this corpus and would need review for a new one. Also fixed in the same pass: the repetition counter read "1 / 0" instead of "0 / 1" in Arabic (digits reordered in an RTL context — now forced left-to-right).

## Reciters, reading styles and translation audio — ✅ done (2026-11-05, on request)

- **More sheikhs, in a way that scales.** Nasser Al-Qatami added (11 reciters). Rather than guess more, the full official EveryAyah list (79 recordings) was fetched and the names *not yet added* were handed to the user to choose from; the folder names are checked in a test against a snapshot of that list (`everyayah-folders.json`), so a typo can't ship as silence.
- **Reading styles.** `Reciter` keeps its murattal folder and gains optional `styles` (`mujawwad`, `muallim`) — only where EveryAyah really has them, each file HEAD-checked live: **Mujawwad** for Abdul Basit, Al-Husary and Al-Minshawi; **Muallim** (teaching) for Al-Husary. `UserSettings.reciterStyle` is remembered; for a sheikh without that style the player quietly uses murattal. The style picker appears only when the chosen sheikh has more than one reading (in the player and the reading-settings panel).
- **Translation audio.** An option in the player reads the **English translation (Saheeh International, Ibrahim Walk)** after each verse's recitation, then moves on; repeats finish before the translation, and the last verse stops cleanly. `UserSettings.translationAudio`. EveryAyah also has Urdu, Persian, Azerbaijani and Bosnian translation audio — not wired in.

## Joy layer — colour, light and motion — ✅ first wave done (2026-11-05)

From the user's note that the design was static and flat. Principle: **scripture stays calm, the chrome around it gets life** (Quran, Hadith and azkar text surfaces are untouched). All CSS, no animation library, all under the global `prefers-reduced-motion` switch; verified on real screenshots (desktop/phone, English/Arabic, light/dark).
- **A colour per section** (prayer teal, qibla lapis, quran emerald, hadith terracotta, calendar saffron, zakat amethyst, azkar rose; brighter in dark mode): nav icons, the active item (tinted pill + a marker on the sidebar divider), page-title bars and Home tiles. Driven by `data-hue` / `data-section`.
- **The hero is a sky that follows the day** (`PrayerHero`): dawn blue→peach, golden morning, midday sky, amber afternoon, sunset purple→coral, night indigo; an eight-point-star lattice texture; a ring that fills as the current prayer period runs out (and turns the right way in Arabic); an icon for the period (sunrise / sun / cloud-sun / sunset / moon-star) that floats; the Gregorian **and** Hijri date; a live countdown. Driven by new pure `prayerProgress` (current period, start, fraction — tested), so colour, icon and ring come from one fact.
- **Motion:** blocks rise in one after another on each page; cards and Home tiles lift on hover (tiles glow in their section colour); nav icons spring; buttons press; the next prayer row breathes; stars twinkle on the Ramadan card.
- Dates: the Gregorian date now sits beside the Hijri one on Home and the Prayer page (and in the Calendar hero).
- Not done / next: a prayer-period tint on the page background itself, a tasbih-style tap burst on azkar completion, animated number changes, and page transitions (View Transitions API). (The phone bottom tab bar is done — see below.)

## Ramadan countdown — ✅ done (2026-11-05)

`RamadanCountdown` on Home: **"95 days to go"** with the expected date, becoming **"Day 13 of 30"** with a progress bar and days left during Ramadan, **"Eid Mubarak!"** on the first of Shawwal, and counting to next year's afterwards. Pure `ramadanStatus` in `packages/core/hijri` (follows the Hijri adjustment; cross-checked against the calendar's own Ramadan event). Always says "calculated date — confirm with your local announcement". **Notifications** too: `RAMADAN_COUNTDOWN_MILESTONES` = 30 and 7 days before, at Fajr, through the same engine and the same "remind me about these days" switch (fire-once, stale-safe, adjustment-aware, English + Arabic).

## Quranic duas — ✅ done (2026-11-05)

The plan covered prophetic duas (Hisn al-Muslim: 132 chapters, 266 entries) but not the duas that are *verses of the Qur'an*. New section **"Duas from the Qur'an"** in the Azkar page: 38 duas in 7 themes (forgiveness and mercy; good in this life and the next; family and children; parents; knowledge and ease; trust and protection; the Hereafter and the Fire). **Not hand-typed:** each was generated from the bundled Uthmani text and Saheeh translation for its `reference` (surah:ayah or range), and `quranic-duas.test.ts` re-checks every Arabic text and translation against the Quran data on every run, plus that each parses as exactly one verse block. A verse is given whole (including any introducing words such as "They said, …"). Shown in the Quran face with gold brackets and a "Qur'an 2:201" reference line; `AzkarItem` gained an optional `reference`. Kept apart from the Hisn corpus so that stays a faithful copy of its source. Not schedulable for reminders (the schedule editor still lists the Hisn corpus only).

## Settings, themes and feedback — ✅ done (2026-11-05, on request — ideas from the mobile app "المصلي")

New `/settings` page (nav item, gear icon): appearance (language, **theme**), prayer calculation, Quran and recitation (the same reading controls as the reader), Hijri adjustment and holiday reminders, notifications, **backup** (export / import of the whole store as JSON) and **rate / feedback**.
- **Themes:** `THEME_IDS` = auto (follows the device), Parchment, Emerald, Ocean, Rose, Midnight and AMOLED black (`themeAttributes`, `resolveTheme` in `core/settings`). A theme sets `data-theme` (light or dark) and `data-palette` on `<html>`; a palette is a set of CSS custom properties, so every component follows it with no per-component work.
- **Rating and feedback:** `FeedbackForm` (a 1-5 rating plus a message). There is no server, so nothing is sent anywhere by the app: the form builds a prefilled GitHub issue (`githubIssueUrl`) for the user to review and submit themselves. The rating is also kept in `UserSettings.appRating`. The text says "Rating: 4/5" (no star glyph — the no-emoji guard).

## Zakat v2 — automatic prices, five kinds of wealth — ✅ done (2026-11-05)

Rewrote the calculator around what the user asked: simple, many kinds, no price errors.
- **Kinds:** cash and savings, gold, silver, trade goods, shares/investments (plus money owed to you, and debts due). The result shows the **share each kind contributes** to the zakat.
- **Automatic prices (default).** `core/metal-prices`: gold and silver spot (XAU/XAG per troy ounce, USD) from gold-api.com, and exchange rates from the currency-api on jsDelivr (open.er-api fallback) — all keyless, free, called directly from the client. Converted to the user's currency (chosen from the saved location's country, `currencyForCountry`) and to per-gram prices for the karat chosen. Snapshots are saved on-device and refreshed after 60 minutes (`shouldRefreshSnapshot`), so it works offline with the last prices and says how old they are. Live-checked against real endpoints (EGP 24k about 7,230 per gram on the day).
- **Honest caveat shown on the page:** this is the *international spot price*; a local jeweller's price differs (premium, making charges). A **manual** mode remains for anyone who wants their local price — the user chooses, never silently switched.
- Everything else (nisab choice, combined wealth, 2.5% of all net wealth, parsing of Arabic digits) is unchanged from v1.

## On this day — ✅ done (2026-11-05)

`OnThisDay` on Home and beside the Hijri calendar: events that happened on today's Hijri date, and what is coming up. 15 events in `packages/data/history`, each labelled **Established** or **Traditional date** where scholars differ (e.g. the Prophet's birth).
- **Pinned by Hijri date only.** Early events carry no Gregorian date on purpose: before 1582 the Julian calendar was in use, and converting a Hijri date to a Gregorian date by the modern rule lands 7-9 days off (found while testing). A test pins that no pre-1582 event carries a Gregorian field.
- Follows the user's Hijri adjustment; pure logic in `core/history` (`eventsOnDate`, `nextHistoricalEvents`).

## Progress, prayer tracker and Quran quiz — ✅ done (2026-11-05, on request)

Encouragement the user asked for — points, a competition, a kind word when they do something good — built **personal and pressure-free**: kept on the device, no leaderboard, no ranking, no "you lost your streak" shaming.
- **What earns points** (`core/progress`, pure and tested): a prayer marked as prayed (10; +20 for all five in a day), a dhikr completed (2, capped at 20 a day), a correct quiz answer (5, capped at 20 a day). Caps reward steady practice, not tapping one dhikr for an hour. Un-ticking a prayer takes its points back, so it can't be farmed. **Levels** (`25 x (n-1) x n` points) and 10 **badges** (first prayer, all five, 3/7/30-day streak, 10/100 adhkar, 10 quiz answers, 100/500 points). The state is validated on load (`normalizeProgress`) so a hand-edited import can't break the app.
- **Encouragement** (`encouragementText`): a short message in the user's language as a toast — three wordings per kind so it doesn't repeat itself; streak messages at 3, 7 and 30 days (including the hadith that the most beloved deeds are the most regular, even if small); a wrong quiz answer is gentle ("Close! Learning is the point."). Arabic streak lines avoid number-noun agreement ("سلسلة متواصلة: 30") rather than risking wrong grammar.
- **Prayer ticks** in Home's timetable (see "UI/UX pass" below — they began as a separate tracker card): each prayer row has a tick, enabled only once that prayer's time has started (you can't tick Isha at noon); tap again to undo. **Progress card:** level, bar to the next, streak, last 7 days; badges on the Challenge page.
- **Quran quiz** (`core/quiz`, `QuizGame`, route `/challenge`): ten questions — which surah is number N, the number of a surah, its verse count, Meccan or Medinan, which surah follows — with the answer key computed from the app's own surah data. `quiz.test.ts` in `packages/data` generates 2,000 questions across all 114 surahs and checks every key. No timer: it is for learning. (Questions about the *content* of verses were left out on purpose — each would need hand-checking for correctness and for scholarly differences.)
- Saved under `manarah:progress`, covered by the JSON backup.

## Logo — ✅ done (2026-11-05, on request)

Replaced the old pale-green circle with thin rays by a clearer, more distinctive mark: a **gold minaret with a crescent finial on a deep emerald tile**, with a soft glow around the tip and light rays from the gallery — a *manarah* is a place of light, and the rays also read as the call to prayer carrying outward. One shape, readable down to 16 px (checked). Source `assets/logo.svg`; `favicon.svg`, PWA `icon-192/512.png` and extension `icon-16/48/128.png` are regenerated from it, and the mark now sits beside the name in the app header. The README keeps using `assets/logo.svg`.

## Phone bottom bar — ✅ done (2026-11-05)

Eleven sections no longer fit a phone's top strip comfortably, and the top of the screen is the hardest place to reach with a thumb. On screens under 640px the nav is now a **fixed bottom bar**: Home, Prayer, Quran, Azkar and **More**, which opens a sheet with Qibla, Hadith, Calendar, Zakat, Challenge and Settings. It is the *same set of links* as the sidebar/strip (`.app-nav-more` is `display: contents` on larger screens and the More button is hidden), so tablets and desktops are unchanged apart from the order — the four main sections now come first in the sidebar. The sheet closes on navigation, on Escape and on a tap outside; "More" shows as active while you are on one of its pages; `aria-expanded`/`aria-controls` are set; the bar respects the iPhone home-indicator safe area, and the toast sits above it. Checked on screen at 390px in English and Arabic (RTL), including no horizontal overflow. Not done: the bar has no unit test (the web app has no test setup yet — behaviour was verified in headless Chrome).

## UI/UX pass — Home dashboard, colour, motion — ✅ done (2026-11-05, on request)

Intent: Home should read as a one-glance dashboard on a laptop or desktop, stay calm on a phone, and every colour should be readable — measured, not assumed.

**Home fits one screen (desktop and laptop).** Measured in headless Chrome: Home was 1,779px tall (scrolled 879px at 1440x900); it now fits at **1366x768, 1440x900 and 1920x1080**, in English and Arabic. How: (1) the separate "Mark your prayers" card is gone — `PrayerTimesList` takes an optional `tracking` prop and each prayer row gets the tick, so one card is both the timetable and the day's log (it had listed the same five prayers twice); (2) the side cards have compact forms (progress, Ramadan, On this day limited to one upcoming event with its note clamped to two lines, the Qibla as a small dial beside its two lines); (3) a two-column grid (sky and prayers left, the compact cards right) and tighter page rhythm; (4) on screens under ~820px tall, "On this day" drops its two label lines. **Phones** keep one column: a dashboard squeezed into 390px would only shrink the text, so the aim there is the sky and the first prayers on the first screen (page height 2,716 -> ~1,600px): a one-row header, no tagline, and the quick-link tiles are hidden because the bottom bar is the way into every section.

**Colour — audited with a real contrast check** (every text node on every page, light and dark, English and Arabic, and each palette; script lives in the scratch folder, not the repo). Before: 44 failing text elements in light, with the progress card's white text at 1.5-1.7:1 on its light gradient end, "On this day" dates at 2.9:1, the quiz Start button at 3.7:1; dark mode and the Emerald, Ocean and Rose palettes were 4.2-4.4:1 near-misses. Fixed at the token level: dark `--accent` 5.0:1+, a new `--gold-ink` for gold used as *text* (the leaf-gold stays for ornament), a deeper burnt-orange progress card (white text 4.9-6:1), locked badges no longer faded by opacity, the quiz button darker, the focus ring now `--gold-ink` (it was leaf-gold, 2.6:1 — under the 3:1 non-text minimum), and the three palettes' accent/muted darkened just enough. **What still "fails" and why it is fine:** disabled buttons (WCAG exempts them), the decorative Quran verse ornaments, and the gradient-clipped "95" in the Ramadan card (a false positive of the checker). **`design-tokens.test.ts`** now guards this: it reads the real `styles.css` and checks 10 text/background pairs for every theme (light, dark, Emerald, Ocean, Rose, AMOLED) at 4.5:1, plus the progress card gradient. (`vitest.config.ts` lets `styles.css` through for it — Vitest otherwise blanks CSS imports.)

**Motion — CSS only, existing tokens (`--ease-quiet`, `--ease-spring`, `--dur-tap`), reduced-motion handled by the global rule.** Home's cards now rise in one after another (60-120ms apart) instead of as one block; a prayer tick pops with a spring; the next-prayer highlight changes colour over 300ms instead of snapping. **Removed:** the hover "lift" on information-only cards — a card that lifts looks clickable and isn't; the lift is kept for links and tiles.

Not done: theme-aware hero/sky colours were not re-audited against text beyond the checker's sampling; no automated visual regression (screenshots are checked by hand); the Home fit is by compact CSS rather than a hard viewport lock, so a very long Arabic string or an unusual zoom level can still push it a little past one screen — it degrades to normal scrolling, never clips.

## Arabic means Arabic — ✅ done (2026-11-05, from a user screenshot)

Rule (the user's, restated): when the interface is Arabic everything in it is Arabic; when it is English everything is English. Scripture and its source text stay Arabic in both, and the English translation stays opt-in. Two screenshots showed it being broken — Hadith book titles in English under an Arabic UI, and "Manarah" in the header — so instead of fixing only those, **an audit script loaded every page in each language and listed every visible text node in the wrong script** (it found two more: the city name and a transliterated surah name). Result now: in Arabic mode the only Latin left is deliberate (the "English" language label, "GitHub", the source name "hadith-api", the ISO currency code "EGP"); in English mode the only Arabic outside scripture is the "العربية" language label.
- **The name:** new `app.name` ("Manarah" / "منارة") in the header, the extension popup and the browser tab title (set from the language); the tagline no longer carries a "منارة —" prefix in English mode. In Arabic the name uses the UI Arabic face.
- **Hadith book titles (335 books, all six collections):** the hadith-api's Arabic editions *also* have English section names (checked live), so the Arabic titles had to come from another dataset: **AhmedBaset/hadith-json** (its `chapters[].arabic`), matched to ours **by English title** — all 335 matched; it has one extra Nasa'i chapter ("Oaths and Vows") we don't list. Cleaned: vowel marks stripped for a consistent list, invisible bidi marks removed (a test caught one), Arabic-script-only enforced. `HadithSection.titleAr`; the English-only note is gone; the book filter searches both Arabic and English. Tests pin well-known pairs (كتاب الوضوء = "Ablutions (Wudu')", كتاب الزكاة = "The Book of Zakat"…) because a mis-aligned list would still be "all Arabic" yet name the wrong books. **Licence caveat:** that repository declares no licence; only the short, traditional book names were taken (facts about the collections, not its text), but it is worth knowing.
- **City names:** GeoNames' own Arabic alternate names (CC BY 4.0, the same source as the city list), matched to our 6,252 cities by name + country + coordinates (plus a nearest-place fallback that must also agree on the name — an early version matched Toronto to a neighbourhood). **2,621 cities** now have an Arabic name (Cairo → القاهرة, Riyadh → الرياض, Alexandria → الإسكندرية; Makkah and Madinah set by hand to مكة المكرمة / المدينة المنورة, since GeoNames' preferred form for Madinah is the short one). The rest — mostly smaller cities in countries where nobody has contributed an Arabic name — **still show the English name in Arabic mode**; transliterating them by rule would be guessing. Names were NFKC-normalised, direction marks and vowel marks removed, mixed-script ones rejected (47). GeoNames is community-edited, so a few spellings may be off (e.g. أفيانيدا for Avellaneda). The label is "القاهرة، مصر" (Arabic comma, country name in Arabic) and, in English, now "Cairo, Egypt" rather than "Cairo, EG".
- **Searching in Arabic:** typing "القاهرة", a partial "قاهر", "الاسكندرية" (bare alef) or "المدينه" (ha for ta marbuta) now finds the city (`foldArabic`).
- **Saved locations:** `SavedLocation.nameAr`; a location saved before this existed is upgraded once, the first time the language is Arabic (`""` means "looked up, none exists", so it isn't looked up again).
- **Quran:** the transliterated surah name ("Al-Faatiha") is no longer shown in Arabic mode — in the reader's subtitle, the navigator list, or the extension's verse-of-the-day; it stays in English mode, where it helps pronunciation, and the navigator still *searches* by it.

## Design system v2 — modern controls, elevation, real motion — ✅ done (2026-11-05, on request)

Intent: keep it simple, clear and direct — no new decoration; make what is already there feel modern and responsive. Done at the *token* level so every page changes at once, then checked on every route.
- **Shape and depth.** Corners went from 3px to a family: cards 14, controls 10, small rows 8 (`--radius-page/-control/-sm`); information cards rest on a soft warm shadow (`--shadow-1`). **Scripture surfaces stay flat** (Quran text, hadith cards, azkar) — calm by design. A box nested inside a card (Settings) is a light tint with no border or shadow, not another card.
- **Controls.** Selects use one drawn chevron (light/dark variants, flips in RTL) instead of each browser's arrow; every field has the same hover border and a soft accent focus ring; **checkboxes became switches** (the native blue one clashed with every palette) — the thumb slides on `transform` with a slight spring, flips direction in RTL (verified: -18px in Arabic) and stretches a little while pressed; a label holding a switch lays out on one line.
- **Motion — CSS plus one platform API, no library.** Durations `--dur-fast` 140ms / `--dur-base` 240ms with the existing `--ease-quiet` / `--ease-spring`; one default for every pressable thing (colour/shadow/transform transitions, a 0.97 press); pages enter in 40ms steps instead of up to 300ms. **Moving between sections crossfades** and **changing the theme crossfades**, using the View Transitions API (`apps/web/src/view-transition.ts`): the header and nav hold still (`view-transition-name`), links keep working with modified clicks (new tab), and where the browser lacks it, or the person prefers reduced motion, the change simply happens (verified in Chrome: transitions run on navigation and theme change; zero start under reduced motion, and navigation still works). **Loading** a hadith book shows skeleton cards with a calm shimmer instead of a line of text; assistive tech still hears "Loading…". Removed in the previous pass: hover-lift on cards that aren't clickable.
- **Rhythm.** Page gap 28 -> 20px, location bar no longer adds its own bottom margin.
- **A real find on the way: the prayer hero's small text failed contrast in two of its six sky colours** (Fajr and Maghrib), and its dimming (opacity 0.8-0.88) hurt the others — invisible to an audit run at one time of day. Fixed (deeper gradient ends, full-strength text) and now guarded by a test over all six periods (`design-tokens.test.ts`).
- Not done: a sliding indicator under the active nav item and count-up numbers (both JS for little gain); the Quran, Hadith and Azkar reading surfaces were left alone on purpose.

## Morning azkar and evening azkar, separated — ✅ done (2026-11-05, on request: "to avoid the confusion")

Hisn al-Muslim has one chapter (27) for both times: each dhikr written once, the evening wording in square brackets where it differs ("[وإذا أمسى قال: …]"), and a few items restricted to one time by their own wording. Faithful to the book, but it leaves the reader to work out which wording to say now. The app now shows **two lists — "Morning azkar" and "Evening azkar"** — each its own tab, with its own reminder (morning at Fajr, evening at Asr). Browsable tabs 11 -> 12; categories 132 -> 133; items 266 -> 286 (morning 23, evening 21).
- **Derived, not retyped** (`packages/data/src/azkar/morning-evening.ts`): the upstream chapter stays untouched in `categories.json`. Morning = the chapter with the bracketed evening alternatives removed. Evening = the same text with explicit substitutions of the words the source itself marks (أصبحنا -> أمسينا, هذا اليوم -> هذه الليلة, النشور -> المصير in the "بك أصبحنا" dua, the feminine pronouns in "خير هذه الليلة: فتحها…"). The source's own English notes say it for the three abbreviated items: "for the evening, one reads amsaytu instead of asbahtu".
- **What the tests prove against the source** (`morning-evening.test.ts`, 21 tests): for the two items the source gives in full (78, 89) the evening text equals the source's evening wording *letter for letter*; for 77 it starts with and contains the source's two evening clauses; for 80, 81 and 90 it starts with the words the source says to start with; every substitution must match real text (a changed upstream text fails loudly); an evening item differs from its morning twin by the substituted words and nothing else; no bracket and no morning verb remains in the evening list (and vice versa) except the one dua that legitimately says both. The tests found two genuine problems while I was writing them — the vowel marks of the source and my rules were in a different order (shadda before or after the vowel; identical on screen, different as strings), so substitutions are applied in Unicode canonical form (NFC).
- **Which list an item goes in:** items the text restricts stay in that list only — "إذا أصبح" (100x tahlil, 3x tasbih "عدد خلقه", the knowledge/provision dua) morning only; "إذا أمسى" (the 3x "أعوذ بكلمات الله التامات") evening only. Everything the source does *not* restrict appears in both — including Ayat al-Kursi, the three Quls, Sayyid al-Istighfar, and "أستغفر الله مائة مرة في اليوم", which the source places in the chapter without naming a time (if you would rather it sit in the morning list only, it is one id in `MORNING_ONLY`).
- **English:** where the source translated the evening wording it is used as written; otherwise a plain swap (morning -> evening, this day -> this night); the book's "Note: for the evening, one reads…" lines are dropped from both lists (they explain the split). The morning recording (`audioUrl`) is not attached to an evening wording.
- **Ids and old settings:** the morning list keeps id `27` (so reminders and schedules saved before the split still point at it); the evening list is `27e`. Someone who had remapped `27` to the old combined "morning and evening" trigger will now get the morning list at both slots — rare, and one tap in Settings to fix. The `morning-evening` trigger type remains valid for saved schedules.

## Azkar progress, the tasbih, and sharing — ✅ done (2026-11-05, on request)

**Azkar progress bar** (`AzkarList`, `core/azkar-progress`). A bar stays in view (sticky) while you go down a list: **"Dhikr 4 of 23 · 3 done"**, a fill for how far through you are, the dhikr to say now outlined, and — when you finish one — the list scrolls to the next after the completion animation (instant under reduced motion). Tapping "Dhikr 4 of 23" jumps back to the current one. Built for the phone as much as the desktop: no scrolling to find your place. Progress **survives leaving the page** (`manarah:azkar-progress`, per list, per day) and **a new day starts every list from zero** — the morning azkar you finished yesterday are not finished today. Finished lists get a tick in their tab ("Morning azkar ✓"). "Start again" needs a second tap (it asks, then clears), so nothing is lost by accident. **A finding worth keeping:** the first version weighed every *repetition*, which made the bar read 1.4% after 3 of 23 dhikr (the 100x tasbih items dominate); now every dhikr weighs the same, with partial credit for the one you are part-way through.

**Tasbih** (`/tasbih`, `core/tasbih`, `TasbihCounter`). A ring of 33 beads that turns one bead with every tap (a spring), the count in the middle, a gold guide bead and tassel fixed at the top; counted beads fill in. Eight phrases (سبحان الله، الحمد لله، الله أكبر، لا إله إلا الله، أستغفر الله، سبحان الله وبحمده، لا حول ولا قوة إلا بالله، الصلاة على النبي), rounds of 33 / 99 / 100 or a free count, a round that completes with a gold ring, a message and a longer vibration; one-step undo (takes back even the tap that completed a round), "new round", today's taps and rounds, the all-time total, and a vibration switch (shown only where the device can vibrate). The ring is one big button — thumb-sized on a phone, the space bar on a keyboard. Personal and private, stored on the device (`manarah:tasbih`, covered by the JSON backup). **The phrases are checked against the shipped Hisn al-Muslim text** (a short phrase everyone knows is exactly where a slipped letter goes unnoticed). **It feeds the encouragement system:** a completed round earns 3 points, capped at 10 rounds a day, plus a "ten rounds" badge. Known gap: undoing a round does not take its 3 points back (the cap limits what that could ever be worth).

**Sharing.** A **Share** button in the header (the icon alone on phones) and a Share section in Settings. Where the device has a share sheet (phones, Safari, Chrome on Windows/Android) the button opens it directly; elsewhere a dialog offers **WhatsApp, Telegram, email and copy link**. The message is in the user's language and says only what is true ("most of it works offline"). The panel opens with «مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ» (Sahih Muslim) — the reason to share. **Nothing is collected or sent to us**; each option just opens the person's own app, and the link is the app's own address wherever it is hosted. No points are given for sharing (it can't be verified, and the reward is not ours to count). Found while testing: the dialog first rendered *behind* the page, because the header became its own stacking context when it was given a `view-transition-name`; it now renders in a portal on the page body.

Also caught: the tasbih count was black on a dark background in dark mode (a `<button>` with no text colour set) — found by the contrast audit, fixed.

## Tasbih: sound and real beads — ✅ done (2026-11-05, on request)

**Sound — optional, silent by default.** A "Sound" button next to Undo / New round (a tasbih is often used where quiet matters, so it starts off and is one tap to turn on; turning it on plays one bead so you hear what you chose). **No audio files:** every sound is synthesised in the browser with the Web Audio API (`ui/src/tasbih-sound.ts`), so nothing to license, nothing to download, and it works offline. Each bead is a very short, quiet knock whose character follows the **material** — wood knocks, pearl and turquoise tick like glass, emerald and onyx clack like stone, amber is soft — varied about 3% in pitch each time so a long count does not sound like a machine; finishing a round is a gentle G-C-E chime. The audio context is created only on the first sound (browsers only allow it inside a tap), a suspended one is resumed, and where there is no Web Audio the calls do nothing. Verified in Chrome: with sound off no audio context is even created; on, one sound per tap, a different timbre per material, the chime at the end of a round; off again, silence.

**Real beads, six materials.** The ring is now drawn like a real tasbih: shaded spheres with a highlight, strung on a visible cord, a larger gold guide bead (the imam) with two spacer beads, and a tassel. Counted beads are full colour and the rest translucent, so the cord shows through. Each bead's face turns back by as much as the ring turns (same curve), so the light always comes from the top left instead of circling. The **material picker** — olive wood, amber, pearl, emerald, turquoise, onyx (خشب الزيتون، كهرمان، لؤلؤ، زمرد، فيروز، عقيق أسود) — changes the beads, cord, tassel and the surface they lie on (pearls on dark velvet, amber on dark chocolate, the rest on parchment or sand) and, with it, the sound. The surface is fixed per material, not part of the site theme: a tasbih is an object. **Guarded by tests:** each material's count and round size must stay readable over its whole surface (4.5:1), and its beads and cord must stand out from it (a test caught turquoise at 1.95 — deepened). On phones the eight dhikr are one swipeable row so the ring stays on the first screen.

## "Its virtue", Listen, and a simpler tasbih — ✅ done (2026-11-05, on request)

**"Its virtue" dropdown** (`VirtueDropdown`, `data/azkar/virtues.ts`). Under a dhikr, a small gold "Its virtue / فضل هذا الذكر" button opens what the Prophet said about it — **his own words in Arabic, with the book and hadith number** (« … »  Sahih al-Bukhari · Book of Invocations · no. 6405), the English meaning when translations are on (always in an English interface on the tasbih page), and a note that only Bukhari and Muslim are shown. Closed by default so the dhikr stays what you read. 20 virtues, on 14 azkar items and all 8 tasbih phrases.
- **Nothing is typed from memory — this is the one place a mistake would be a mistake about religion.** Each virtue was found by searching the actual text of Sahih al-Bukhari / Sahih Muslim (the hadith-api Arabic editions the Hadith section already uses) and cutting the Prophet's words out *exactly as written*, with the number and book that text gives. A candidate whose words were not found was dropped. **The method caught real problems:** my memory said "ten times = freeing *four* people" (that is the Muslim wording; Bukhari 6404 says *one* slave), one candidate matched a duplicate mislabelled "المقدمة", a narration I remembered as "three times in the evening" is in the text as the scorpion story («أما لو قلت حين أمسيت…»), the first excerpt for "La hawla…" never actually named the phrase, and several cuts lost the final vowel mark or an Qur'an closing bracket.
- **Only Sahih al-Bukhari and Sahih Muslim** — the two books whose every hadith the community accepts. Many well-loved fadail rest on weaker chains and are **deliberately left out**: e.g. "Hasbiyallah … ×7" (its attribution to the Prophet is not firmly established), and Ayat al-Kursi after the prayer / in the morning (not in these two books; Ayat al-Kursi has its Bukhari virtue *before sleep*, so it appears only on that list). A dhikr with no dropdown has none *here*; it does not mean it has no reward, and the panel says so.
- **Placed only where the hadith is about that very dhikr** — and enforced: a test requires each dhikr's own text to contain the phrase its virtue is about (e.g. "ثلاثاً وثلاثين" on the before-sleep tasbih, "أعوذ بكلمات الله التامات" on the evening dhikr); the after-prayer hadith, which names the three acts by verb (سَبَّحَ، حَمِدَ، كَبَّرَ), is checked by those verbs. Tests also pin each hadith's number and key words, and that each English meaning agrees with the Arabic on every number ("ten times", "thirty-three", "a slave" not "four"). Known limit: the English meanings are my plain rendering of the Arabic shown above them, kept to what the words say; they have not had a scholar's review. Book titles come from the app's own Hadith section.

**Listen.** A "Listen / استماع" button beside each dhikr's counter plays **the real recording of that dhikr** (hisnmuslim.com — a human voice, every one of the 266 items has one). One plays at a time; second tap pauses; it stops when you leave the list; if it cannot play it says so. The data lists the recordings as `http://`, which a secure page would block, so they are requested over `https` (checked reachable). **Limits, stated honestly:** it needs a connection (these cross-origin recordings can't be cached for offline replay); the six evening dhikr whose wording we re-derived (77, 78, 80, 81, 89, 90) have *no* Listen, because the recording is the morning wording; the Quranic-duas section has no recordings in the data. **Hadith audio is not offered:** there is no free human recording of hadith to use, and a machine voice reading the Prophet's words (with a chain, unvowelled) would misread them — so reading (already there) is what the Hadith section offers.

**Tasbih: round size removed.** The 33 / 99 / 100 / Free row is gone — a round is one turn of the 33-bead ring. (`target` left the saved state; an earlier choice is ignored on load.)

## Simpler tasbih, install guide, Tafsir al-Muyassar — ✅ done (2026-11-05, on request)

**Tasbih simplified (supersedes the two tasbih sections above where they differ).** The "round size" idea is gone entirely — no 33/99/100 target, no "/33" under the count, no rounds stat, "New round" is just **Reset**. A turn of the 33-bead ring is the only unit (a gentle "Masha'Allah" and a progress point at each 33; the `tasbih-10` badge is 330). **Vibration removed.** **Sound is three soft choices — Off / Click / Wood / Bell** — still synthesised with Web Audio (no files, works offline); old saved state (`target`, `vibrate`, `rounds`, `sound: true`) is read safely. Measured offline with an `OfflineAudioContext` (levels, decay, partials) but **nobody has listened to it: the user already called the first version "not good", so treat the sounds as unverified by ear** and expect to adjust them from feedback.

**Install.** The app now tells people how to get it: an **Install** button in the header (starts the browser's own install where Chrome/Edge offers it; opens the steps on an iPhone/Android browser that doesn't), an "Install the app" section in **Settings** (this device's steps first, others folded; says so when already installed), and a "Get the app" section in the README. Verified in Chrome with an iPhone user agent, a simulated install offer and standalone mode. The browser extension is still on no store (Chrome Web Store has a one-time fee, against the zero-cost rule; Edge Add-ons is free) — README documents load-unpacked.

**The install card (so nobody has to hunt for it).** A header button and a Settings section are easy to miss, so a new visitor who has not installed now gets a small **"Install Manarah" card** about 6 seconds after opening (so the first thing seen is the app): the app icon, one line on what they get ("its own icon, opens full screen, works without internet, free"), a main button and "Not now". Where the browser can install (Chrome/Edge) the main button is **Install** and starts the real install; on an iPhone, or an Android browser that has not offered, it is **Show me how** and opens this device's steps. Rules (`core/install/nudge.ts`, tested): never once installed; not on a computer browser that cannot install (nothing to offer); each "Not now" earns a longer silence — 3 days, then 14, then never (header button and Settings remain); a clock set back cannot silence it for ever; never on the tasbih screen (thumb taps the lower half); no backdrop, no focus-stealing. The answer is kept per device in the browser (not synced). Phone: above the tab bar; computer: corner (mirrored in Arabic). Verified in Chrome: iPhone, Android with an install offer, desktop with/without an offer, Arabic, dark, installed (none), tasbih (none), reload after dismissing (none).

**Phone fit.** The header (Install + Share + language) wraps cleanly at 360 px; a long reciter name no longer pushes the Settings page past the screen. Swept 360/390/414 px across every route: 0 overflow cases.

**Tafsir al-Muyassar (التفسير الميسر)** was missing; added as Quran.com resource 16 (confirmed in its `/resources/tafsirs` listing and by fetching 2:255), first among the Arabic editions — so it is also the default tafsir in Arabic. Pinned by a test.

**Asked for, not done, and why**
- **Reciters عبدالله الأسمر and فيصل بن جذيان:** neither is in EveryAyah (what the app streams from), mp3quran.net, Quran.com or Quranic Audio — checked their live listings. Adding them needs a source with a licence we can stream from; none was found. Needs the user to point to one (or the reciters' own permission/host).
- **Calmer azkar Listen voice:** the current recordings (hisnmuslim.com) are the only complete per-dhikr human set found; no better-sounding set with an open licence was found. One honest option not yet built: for the Quranic items (Ayat al-Kursi, the three Quls, verses) play the user's chosen Quran reciter via EveryAyah instead.
- **Evidence/virtue for every hadith:** the Hadith section already shows the Arabic, source book + number and scholars' gradings for all six books. A verified "virtue" per hadith for ~35,000 hadith can't be written without a sourced dataset; sunnah.com (which has it) blocks automated checks, so links to it were not added unverified.

## Radio — ✅ done (2026-11-07, on request: "is the radio in the plan?")

**What it is.** A **Radio** section (under "More" on a phone, in the sidebar elsewhere): **172 live stations** — the Saudi Quran Radio first, a station for each of ~125 reciters (with the reading shown when one reciter has several: Warsh, Qalon, Al-Doori …, Mujawwad), plus tafsir / seerah / Riyad as-Salihin / Sahih Muslim lessons, the **Morning and Evening azkar** and ruqyah stations, and Quran translations in 20 languages. Search (Arabic however it is spelled, or English), kinds as chips, a ★ to keep favourites, and "Continue with …" for the last one. Tapping the playing station pauses it.

**It keeps playing.** The audio lives at the app level, not in the page: go to Quran or Prayer and a small player (name, Live / Paused, play-pause, stop) stays above the tab bar; the phone's lock screen and headphone buttons control it (Media Session). A live stream has nothing to seek, so pause means "stop listening" and play reconnects to *now*. **It steps aside** when a verse recitation or an azkar recording starts (so two voices never play together). No connection says so and **reconnects by itself** when the network returns; a station that will not play says that instead.

**Where the stations come from, and what was checked.** MP3Quran.net's public catalogue (177 stations), snapshotted into the app (`data/radio/stations.json`) **after opening every stream**: 172 answered with live audio, the 5 that returned 404/401/500 were left out (a test pins that). A snapshot, not a live fetch, so the list works offline and a change at the source cannot silently change what plays. Names were tidied; readings come from MP3Quran's own reading names for each reciter, and one (Muftah al-Saltany's "al-Doori", id 92 → from al-Kisai) is inferred by elimination, noted in the file. Verified in Chrome with the **real Saudi Quran Radio stream**: plays, mini-player follows to other pages, pause/resume/stop, favourites and "Continue" survive a reload, offline → message → recovers, Arabic/RTL, desktop.

**Limits, stated honestly.** Needs a connection (live streams can't be cached). On a phone, background/screen-off playback is up to the browser: it generally continues for an audio stream with Media Session, but iOS Safari may pause it after a while — not tested on a real phone. Not in the browser extension yet. **Faisal bin Judhyan and Abdullah Al-Asmari are not in this catalogue** (the user asked for them for the azkar voice — still open, see above). Radio audio is *streamed*, never stored or re-hosted, from the stations' own servers.

## Notifications — where it stands and what is worth adding (2026-11-05)

**In the plan and built:** prayer times; azkar after each prayer; morning azkar at Fajr and evening azkar at Asr (now separate lists); azkar before sleep; custom-time azkar; Islamic observances the evening before and on the day; the Ramadan countdown; all in Arabic and English, each at most once a day, stale ones dropped silently. **The big limit, by design:** on the web they fire only while the app is open in a tab (and in the extension, only while the browser is running). A PWA cannot be woken by the system without a push server, and the zero-server rule rules that out — it is the single biggest gap between this and a native app. Not built: desktop (Tauri) and phone (Capacitor) apps, which *would* schedule real background notifications.

**Worth adding, in order:** (1) **per-prayer and per-observance on/off, "N minutes before", snooze** (already named in the plan as Azkar engine v2 — the most-asked-for controls); (2) **Friday (Jumu'ah)** — a weekly reminder for Surat al-Kahf, salawat and going early; (3) **a "finish your adhkar" nudge** — now possible, because the app knows whether today's morning/evening list is done (gentle, once, no streak-shaming); (4) **adhan sound** as an option; (5) the real fix for closed-app notifications: a free serverless push relay (Web Push needs a small server to hold subscriptions) — a deliberate departure from "zero servers", so it needs a decision, not a default.

## Testing strategy — ✅ framework in place, coverage ongoing

One framework everywhere: **Vitest**, with `@testing-library/react` + `jsdom` for component tests. Four layers, in priority order:

1. **Domain-logic unit tests (`packages/core`)** — ✅ pure functions only, no `chrome.*`/DOM: prayer times vs. known reference values, Qibla bearing/distance vs. known landmarks, notification/badge decision logic. Highest-value layer: religious/time-sensitive correctness bugs here are the worst kind to ship.
2. **Data integrity tests (`packages/data`)** — ✅ exact surah/verse counts (114/6236), no empty verse text, azkar category/item counts, no orphaned trigger values, city data sanity checks.
3. **Storage adapter tests (`packages/storage`)** — ✅ IndexedDB adapter (via `fake-indexeddb`), `chrome.storage.sync` adapter (via a minimal fake `chrome` global), export/import JSON round-trip.
4. **Component tests (`packages/ui`)** — ✅ render + interaction tests for shared components via Testing Library, not full browser rendering.
5. **End-to-end/browser testing (Playwright)** — ⬜ not run locally: launching Chromium fails in the primary dev environment (`spawn UNKNOWN`, looks like a machine-level restriction, not a project/Playwright problem). Should still be written and wired into CI (a GitHub Actions Linux runner won't hit this restriction) — deferred, not abandoned, and not yet in `ci.yml`.

**CI**: `.github/workflows/ci.yml` runs `pnpm typecheck && pnpm -r test` plus both app builds on every push/PR; `deploy-web.yml` additionally requires tests to pass before publishing to Pages. ✅ both in place.

## Verification (manual, per surface)

- **Web/PWA**: `pnpm --filter web dev`; confirm prayer times match a known reference (e.g. IslamicFinder, same city/method) within a minute; confirm offline mode (DevTools → Offline) still renders cached Quran text and previously-fetched azkar.
- **Extension**: `pnpm --filter extension build`, load unpacked in `chrome://extensions`; confirm popup shows correct prayer countdown; confirm a `chrome.alarms`-triggered notification fires at the next scheduled azkar/prayer time; confirm settings persist via `chrome.storage.sync`.
- **Storage layer**: unit tests in `packages/storage` for the IndexedDB adapter and export/import round-trip (export → clear store → import → data matches).
- **Desktop/mobile** (Phase 2+): `tauri dev` / Capacitor emulator run; confirm native notifications fire and system tray/menu bar icon behaves correctly.

**Visual verification (updated 2026-11-05).** Playwright's bundled Chromium still can't launch here, but the *installed* Chrome can: `vite preview` on the built web app, then `puppeteer-core` (installed in a scratch folder, nothing added to the project) driving `C:\Program Files\Google\Chrome\Application\chrome.exe` headless, with a granted geolocation, takes real screenshots of every route at desktop and phone sizes in English and Arabic. The layout work below was verified that way — and it caught problems unit tests can't (cards touching, rows misaligned by wrapping labels, a nav wrapping into two rows). Everything built *before* 2026-11-05 was verified only by inspecting built CSS/JS and by the user's own screenshots; treat those screens as due for the same pass.

---

## Known gaps / smallest real next steps

- **E2E/browser testing** — Playwright's Chromium is blocked locally, but the installed Chrome works (see "Visual verification"), so a Playwright run with `channel: "chrome"` is likely to work here too — untried. Not yet in CI. Real gap, deferred not abandoned.
- **Observance reminders: no per-observance choice yet** — one on/off switch for all of them (Calendar page). Per-observance toggles, "N days before" and snooze belong with Azkar engine v2 (Phase 2).
- **Further translations** — one English translation (Saheeh International) is fetched and wired in; other languages/editions are still unfetched (tafsir is done — roadmap step 5). Multi-translation remains a Phase 2 item.
- **Tafsir offline** — only tafsir already read is available offline (service-worker cache); there's no "download this tafsir for offline" bulk option yet.

---

## Working conventions

- Pure decision logic goes in `packages/core`, free of `chrome.*`/DOM calls, with a thin platform-specific wrapper injecting those calls.
- Every new dataset or data-derived function gets a data-integrity test.
- No new runtime dependencies for things CSS can already do — deliberately no Framer Motion/Rive; CSS-only motion, revisit only if a specific interaction genuinely can't be done in CSS.
- Don't guess a font/API URL that can't be verified as licensed and reachable — substitute a verified alternative and say so explicitly (e.g. KFGQPC Uthmanic Script HAFS → Amiri).
- Commits and PRs in this repo must never carry Claude/Anthropic attribution.
