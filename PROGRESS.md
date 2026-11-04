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

**Test count**: 565 tests passing across all 4 packages (`core` 209, `storage` 17, `data` 53, `ui` 269), as of the last full run. Both `pnpm --filter web build` and `pnpm --filter extension build` succeed cleanly.

### Prayer / Qibla / Azkar polish — ✅ done (2026-09-30, on request)

- [x] **Saved location** — `UserSettings.location` (`SavedLocation`: `source` "gps"|"city", `name`, `countryCode`) now travels with `coordinates`. A city picked by hand is never overwritten by GPS on the next visit (`shouldRefreshLocationFromGps`) — previously every load re-ran geolocation and silently replaced it. GPS fixes are named after the nearest bundled GeoNames city within 50 km (`nearestCity`, on-device, no reverse-geocoding service). `LocationSummary` ("📍 Cairo, Egypt · Chosen by you — saved" + Change → "Use my current location" / city search) replaces the Home-only city search and the old "go to Home" dead end on Prayer and Qibla. Settings saved before this have no `location`, so they're treated as GPS once; re-picking a city pins it.
- [x] **Qibla finder** — full-page `QiblaFinder` on the Qibla route (the compact `QiblaCompass` card stays on Home/extension): large SVG compass rose (N/E/S/W, 5° ticks, north in henna), 🕋 on the rim with a gold line from the centre, and one plain instruction — "Turn right 36°" / "Turn left 34°" / "✓ You're facing the Qibla" with a live heading (`qiblaTurn`, always the shorter way), or "Face 136° — Southeast" without one (`compassPoint`). Live mode turns the rose under a fixed pointer, taking the short way across 359°→0° instead of spinning. "Enable live compass" button where iOS requires a tapped `DeviceOrientationEvent.requestPermission()` — before this, iOS never delivered heading at all.
- [x] **Azkar sections** — the Azkar page showed only category 27 (morning/evening) out of 132. `AzkarBrowser` now organises all of Hisn al-Muslim into 13 themed sections (`AZKAR_SECTIONS` in `packages/data`: morning & evening, sleep, prayer, wudu & mosque, home & clothing, food & fasting, travel, distress & protection, illness & funerals, weather & nature, family & social, Hajj & Umrah, dhikr & forgiveness) with section tabs, per-section category cards, and a search across all category titles in English or Arabic (harakat-insensitive). Every category with content is in exactly one section (data test). Categories now carry `nameArabic` from hisnmuslim.com's own Arabic index (same 132 ids, verified one-to-one), shown in the Arabic UI in the browser, the list heading, and the schedule editor. The 132-row schedule editor is collapsed under a `<details>` so it no longer buries the azkar.

### Phase 2 — Growth — ⬜ not started

- [ ] Azkar engine v2: richer customization (per-category remap to any time/trigger, custom dua playlists, notification style choice, snooze)
- [ ] Radio module: curated live Quran stations + MP3Quran.net catalog player, persists across tabs/screen-off
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
- Prayer-time-driven ambient background gradient (Fajr → indigo, Dhuhr → neutral, Asr → amber, ...) — needs new "what period is it right now" logic, a real feature addition
- Full hand-drawn geometric icon set (rub el-hizb/star motifs) for *every* glyph — superseded by the "Iconography" section above (vendored generic icons + 5 custom domain icons); an optional rub el-hizb star at hizb-quarter boundaries in the reader is still open
- Sound effects (tasbih click, completion chime) — needs asset sourcing + an audio-preference setting
- Native mobile widgets (iOS Live Activities / Android Dynamic Island) — needs a native Capacitor target, reopens the store-fee question above
- KFGQPC Uthmanic Script HAFS font — no verified, licensed, freely-linkable source found; Amiri is the substitute, not expected to change without a real source turning up

---

## Quran reader parity roadmap

Started after reviewing Quran.com, Sunnah.com, and corpus.quran.com in detail — the goal is a reader that matches their depth and interaction quality (audio, per-word detail, tafsir, notes, every navigation mode), not just their data. Ordered by dependency: each item mostly builds on the one before it. Supersedes the scattered Quran-related bullets in Phase 2/3 below — those still show status, but this is the authoritative build order.

1. [x] **Translation display** — one bundled edition (Saheeh International), show/hide toggle in `QuranReader`. *(Multi-edition selection is still open — see Phase 2 list.)*
2. [x] **Navigation overhaul** — `QuranNavigator`: tabbed Surah/Ayah/Juz'/Page picker with search, replacing the old surah-only list; per-verse `focusAyah` jump-and-highlight in `QuranReader`; juz'/page/manzil/ruku'/sajdah metadata (`packages/data/quran/metadata.json`, sourced free from the same AlQuran Cloud response as the translation).
3. [x] **Audio recitation player** — `QuranAudioPlayer`: 10 curated reciters, play/pause/prev/next, repeat count (1/2/3/5×), speed (0.75–2×), auto-scroll + persistent highlight for the playing verse (`QuranReader`'s new `playingAyah`), per-verse play button. Built entirely on EveryAyah.com per-verse files (no surah-wide file + timestamp sync needed) — every reciter folder name and the URL pattern verified live before use, not guessed.
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
   - Known limits: **no hadith search yet** (the plan's natural next increment — needs either a per-collection search index or fetching books on demand); no bookmarks/notes for hadith and no cross-link from the tafsir panel; book titles are English-only (the dataset has no Arabic titles — the Arabic UI says so); the app doesn't remember which book you were reading across navigation; hadith numbering follows the source edition (Muslim's printed numbers such as "8.01" are shown as given) and can differ from printed editions — the page says so.
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
- **No price feed.** A live gold/silver API would break the zero-cost/no-server rule, and a bundled price would be silently wrong within weeks — so the user enters today's per-gram prices and the nisab is derived from them. If a needed price is missing the result says which one instead of guessing.
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
