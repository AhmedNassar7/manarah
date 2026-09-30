# Manarah (منارة) — Master Plan & Progress

**Status as of 2026-09-30.** Single source of truth for this project: the full plan (architecture, data sourcing, phased roadmap, testing strategy) *and* what's actually done vs. in progress vs. not started. Lives in the codebase — not in any AI tool's local plan storage — so any contributor, human or LLM, can read it directly. Update this file whenever a plan item's status changes or a decision changes; don't let it drift from reality.

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
                 - hijri: Gregorian↔Hijri conversion, fixed-date Islamic events, nextOccurrence     ✅
                 - verse-annotations: per-verse bookmarks/notes model, copy/share text formatting    ✅
                 - tafsir: Quran.com tafsir URL/response parsing, HTML → plain-text blocks, edition choice ✅
                 - word-by-word: Quran.com per-word meaning/transliteration URL + response parsing       ✅
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
| Hadith | sunnah.com API, six canonical collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah) | ⬜ Phase 3 | Free key via signup, fine for non-commercial use |
| Hijri calendar | Self-contained tabular/arithmetic conversion in `packages/core/hijri` | ✅ conversion + fixed-date events done | Computed client-side, no network call; arithmetic estimate, ±1-2 days from real moon-sighting-based announcements — not authoritative for determining observances |

## Notifications (all scheduled on-device, no push server anywhere)

| Surface | Mechanism | Status |
|---|---|---|
| Extension | `chrome.alarms` (background service worker, 1-minute tick) → `chrome.notifications` + toolbar badge | ✅ done |
| Web/PWA | Plain `setInterval` while the tab is open → `ServiceWorkerRegistration.showNotification()` (falls back to `new Notification()` if no SW), reusing the same `runNotificationCheck` core logic as the extension | ✅ done — no push server (zero-cost constraint), so it only fires while a tab is open, same caveat as the badge/countdown |
| Desktop (Tauri) | Native OS notification API via Tauri, same locally-computed trigger times | ⬜ Phase 2 |
| Mobile (Capacitor) | `@capacitor/local-notifications`, pre-scheduled daily windows | ⬜ Phase 2 |

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
- [x] Bundle size: verse text and city list lazy `import()`-loaded per-surah/on-search, keeping PWA precache under Workbox's default 2MB-per-file limit (verified by direct bundle inspection)
- [x] CI: `ci.yml` (typecheck + test + both builds on every push/PR), `deploy-web.yml` (tests gate the Pages deploy)

**Test count**: 279 tests passing across all 4 packages (`core` 99, `storage` 17, `data` 33, `ui` 130), as of the last full run. Both `pnpm --filter web build` and `pnpm --filter extension build` succeed cleanly.

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

- [ ] Hadith/books library (sunnah.com), cross-linked from tafsir
- [ ] Hijri calendar with holiday reminders (Ramadan, Eid, Ashura, White Days), Qada/fasting tracker, Zakat calculator
- [ ] Khatmah (completion) reading-plan generator
- [ ] AR/camera-assisted Qibla on mobile

### Explicitly deferred / optional — not part of the build

- GitHub Gist or Firebase/Supabase-based cross-device sync — breaks the zero-server constraint's spirit; storage layer allows it later without a rewrite, but not planned
- Any social/community feed — keeps the product lean against Muslim Pro-style bloat
- Native App Store/Play Store listings — PWA + Capacitor sideload/Chrome Web Store cover "mobile"/"extension" without the $99/yr + $25 store fees; revisit only if official store listings are explicitly wanted later
- Three-column desktop reader layout (index / page / marginalia) + "immersive reader" mode that hides chrome on scroll — real layout restructuring, not a styling tweak
- Framer Motion / Rive — deliberately staying CSS-only; revisit only if a specific interaction genuinely can't be done in CSS
- Prayer-time-driven ambient background gradient (Fajr → indigo, Dhuhr → neutral, Asr → amber, ...) — needs new "what period is it right now" logic, a real feature addition
- Hand-drawn geometric icon set (rub el-hizb/star motifs) replacing inline SVGs — one-time illustration effort
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
7. [ ] **Full-text search** — *Recommended next.* — search Arabic text and translation, jump to a result (distinct from the Ayah/Juz'/Page *navigation* search added in step 2, which only searches numbers/surah names, not verse content).
8. [ ] **Reading settings panel** — script style (Uthmani/IndoPak), font size, default reciter, default/managed translation editions — consolidates choices steps 1, 3, and 6 each introduce into one place instead of scattering controls.
9. [ ] **Hadith library** (sunnah.com API, the Nine Books + selections) — already Phase 3 below; cross-links from the tafsir panel (step 5) once both exist.

**Reviewed but not queued — conflicts with this project's own constraints, flagged rather than silently dropped:**
- **QuranReflect.com-style reflections/notes sharing** — a social/community feed, which the "Explicitly deferred" list below already rules out to stay lean.
- **Quran.AI-style assistant** — needs a hosted LLM backend; conflicts with the zero-server/zero-cost constraint that's been unchanged since day one. Would need its own explicit decision to add a paid/hosted dependency before any work starts here.

---

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

No working browser exists in the primary dev environment used to build this — all styling/motion work is verified by inspecting built CSS/JS output (grepping for expected class names, hex colors, strings), not rendered pixels. The user's own screenshots remain the real verification step for anything visual. This has not changed and won't until a real browser becomes available in-session.

---

## Known gaps / smallest real next steps

- **E2E/browser testing** — blocked locally (see above), not yet in CI either. Real gap, deferred not abandoned.
- **Hijri calendar UI** — the `packages/core/hijri` conversion logic is done, but there's no calendar page/reminder UI consuming it yet (that's the Phase 3 feature item below).
- **Further translations** — one English translation (Saheeh International) is fetched and wired in; other languages/editions are still unfetched (tafsir is done — roadmap step 5). Multi-translation remains a Phase 2 item.
- **Tafsir offline** — only tafsir already read is available offline (service-worker cache); there's no "download this tafsir for offline" bulk option yet.

---

## Working conventions

- Pure decision logic goes in `packages/core`, free of `chrome.*`/DOM calls, with a thin platform-specific wrapper injecting those calls.
- Every new dataset or data-derived function gets a data-integrity test.
- No new runtime dependencies for things CSS can already do — deliberately no Framer Motion/Rive; CSS-only motion, revisit only if a specific interaction genuinely can't be done in CSS.
- Don't guess a font/API URL that can't be verified as licensed and reachable — substitute a verified alternative and say so explicitly (e.g. KFGQPC Uthmanic Script HAFS → Amiri).
- Commits and PRs in this repo must never carry Claude/Anthropic attribution.
