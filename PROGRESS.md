# Manarah (منارة) — Master Plan & Progress

**Status as of 2026-09-16.** Single source of truth for this project: the full plan (architecture, data sourcing, phased roadmap, testing strategy) *and* what's actually done vs. in progress vs. not started. Lives in the codebase — not in any AI tool's local plan storage — so any contributor, human or LLM, can read it directly. Update this file whenever a plan item's status changes or a decision changes; don't let it drift from reality.

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
                 - hijri: date conversion, Islamic calendar events                                ⬜ Phase 3, no logic yet
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
| Translations, tafsir, word-by-word | Quran.com / Quran Foundation API, AlQuran Cloud API | 🚧 Uthmani text only so far; translations/tafsir not yet fetched | Free, CORS-enabled, no key for most endpoints |
| Word-by-word grammar (root, morphology, syntax) | Quranic Arabic Corpus dataset | ⬜ Phase 3 | Purpose-built for a future word-tap grammar feature |
| Verse & surah audio | EveryAyah.com (per-verse), MP3Quran.net (per-surah, multi-reciter, live streams) | ⬜ Phase 2 | Direct `<audio>`/HLS playback, no proxy |
| Tafsir corpus | Ibn Kathir, Al-Tabari, Al-Baghawi, Al-Qurtubi, As-Saadi | ⬜ Phase 2 | Standard Ahl al-Sunnah tafsir canon; via Quran.com's tafsir API where available, else altafsir.com |
| Azkar corpus | Hisn al-Muslim (`wafaaelmaandy/Hisn-Muslim-Json`); Al-Adhkar (an-Nawawi) and Saheeh al-Kalim at-Tayyib (Al-Albani) as richer optional packs | ✅ Hisn al-Muslim (266 items) done · ⬜ optional packs Phase 2/3 | Hisn al-Muslim is the standard compact daily-azkar reference every competitor app also uses |
| City search | GeoNames `cities15000.txt` (CC BY 4.0) | ✅ done | Latin-script alternate names extracted for searchability (e.g. "Mecca"/"Medina") |
| Hadith | sunnah.com API, six canonical collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah) | ⬜ Phase 3 | Free key via signup, fine for non-commercial use |
| Hijri calendar | Small local JS conversion library | ⬜ Phase 3 | Computed client-side, no network call |

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
- [x] Quran: full Uthmani text, all 114 surahs, `SurahList` browser, batched `QuranReader` (40 verses + "Load more"), `lastRead` (surah + ayah) tracking/resume
- [x] Qibla: pure bearing/distance geometry, two-tone needle compass UI, live device-orientation heading where available, "searching" state, one-time lock + ripple
- [x] Extension: popup (today's prayers + Qibla + continue-reading shortcut to the web Quran reader), `chrome_url_overrides.newtab` (verse of the day + prayer countdown + static compass), background `chrome.alarms`, toolbar badge (minutes-to-next-prayer, teal → henna inside 15 min)
- [x] Web: installable PWA (manual `virtual:pwa-register` + hourly update polling to avoid staleness), offline app shell + offline Quran text, `HashRouter`-based multi-page structure (Home/Prayer/Qibla/Quran/Azkar + persistent `Nav`)
- [x] i18n: English + Arabic throughout (~130+ keys), `LanguageProvider`/`useTranslation()`/`LanguageSwitcher`, `<html lang/dir>` kept in sync for RTL
- [x] Manuscript design system: parchment/indigo-night palette, gold-leaf reserved for completion moments, teal-tile accent, henna for time-critical states, Amiri (Quran-script Arabic) vs. Cairo (UI Arabic), Fraunces + Inter (Latin), CSS-only motion scoped to 3 meaningful moments, global `prefers-reduced-motion` kill-switch
- [x] Storage: `Store` interface, `IndexedDbStore` (Dexie, web) / `ChromeSyncStore` (extension), JSON export/import, `withDefaultSettings()` safe-merge helper
- [x] Bundle size: verse text and city list lazy `import()`-loaded per-surah/on-search, keeping PWA precache under Workbox's default 2MB-per-file limit (verified by direct bundle inspection)
- [x] CI: `ci.yml` (typecheck + test + both builds on every push/PR), `deploy-web.yml` (tests gate the Pages deploy)

**Test count**: 157 tests passing across all 4 packages (`core` 50, `storage` 17, `data` 23, `ui` 67), as of the last full run. Both `pnpm --filter web build` and `pnpm --filter extension build` succeed cleanly.

### Phase 2 — Growth — ⬜ not started

- [ ] Azkar engine v2: richer customization (per-category remap to any time/trigger, custom dua playlists, notification style choice, snooze)
- [ ] Radio module: curated live Quran stations + MP3Quran.net catalog player, persists across tabs/screen-off
- [ ] Memorization mode: mic-based recitation tracking via `MediaRecorder`/`SpeechRecognition` (free/on-device, no paid speech service), hide/reveal verses, hifz progress dashboard
- [ ] Multi-translation/multi-tafsir library (Ibn Kathir, Tabari, Qurtubi, Saadi, Jalalayn), offline audio downloads cached in IndexedDB
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

- **`packages/core/hijri`** — referenced in the architecture above but no logic exists yet. Smallest coherent Phase 3 starting point once Phase 2 is underway.
- **E2E/browser testing** — blocked locally (see above), not yet in CI either. Real gap, deferred not abandoned.
- **Translations/tafsir fetch** — only the bundled Uthmani Arabic text exists; no translation or tafsir text has been fetched or wired into the reader yet, despite the API sourcing being decided. First real Phase 2-adjacent content gap.

---

## Working conventions

- Pure decision logic goes in `packages/core`, free of `chrome.*`/DOM calls, with a thin platform-specific wrapper injecting those calls.
- Every new dataset or data-derived function gets a data-integrity test.
- No new runtime dependencies for things CSS can already do — deliberately no Framer Motion/Rive; CSS-only motion, revisit only if a specific interaction genuinely can't be done in CSS.
- Don't guess a font/API URL that can't be verified as licensed and reachable — substitute a verified alternative and say so explicitly (e.g. KFGQPC Uthmanic Script HAFS → Amiri).
- Commits and PRs in this repo must never carry Claude/Anthropic attribution.
