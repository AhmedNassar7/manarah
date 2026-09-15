# Manarah (منارة) — Progress & Roadmap

**Status as of 2026-09-16.** This file is the source of truth for what's built, tested, and next in this repo. It lives in the codebase (not in any AI tool's local plan storage) so any contributor — human or LLM — can read it directly. Update it whenever a phase item lands or a decision changes.

Zero-cost constraint, unchanged since day one: **no server, no database, no paid tier, ever.** Static hosting (GitHub Pages) + free public APIs called directly from the client + on-device storage only.

## Architecture

pnpm workspace monorepo, no Turborepo:

```
packages/core     prayer-times, qibla, notifications, badge, azkar schedule logic — pure, platform-agnostic
packages/ui       shared React components + design system (styles.css) + i18n
packages/storage  Store interface — IndexedDbStore (web, via Dexie) / ChromeSyncStore (extension) + JSON export/import
packages/data     bundled datasets — Quran text, surah metadata, azkar, GeoNames cities
apps/web          React + Vite PWA, routed multi-page app (HashRouter)
apps/extension    MV3 Chrome extension (CRXJS) — popup, new-tab override, background alarms
```

React + Vite + TypeScript (not Next.js — MV3 extension is a first-class target). Vitest everywhere. GitHub Actions CI gates both builds + full test suite on every push/PR; `deploy-web.yml` additionally requires tests to pass before publishing to Pages.

## What's built and tested

**Prayer times & Qibla** — `adhan.js`-based calculation, calculation-method presets, Shafi/Hanafi Asr toggle, geolocation + city search fallback, countdown widget with tomorrow's-Fajr rollover, `PrayerSettingsEditor` for method/Asr school. Qibla compass: pure bearing/distance geometry, two-tone needle SVG, live device-orientation heading when available, a "searching" state while the heading settles, and a one-time lock state/ripple once the bearing is reached. Everything here has a static, north-up fallback when there's no orientation sensor (e.g. extension popup).

**Quran** — Tanzil/AlQuran Cloud Uthmani text for all 114 surahs, bundled and lazy-loaded per surah (code-split, not eagerly bundled). `SurahList` browser, `QuranReader` with batched rendering (40 verses at a time + "Load more") for long surahs, verse-of-the-day on the extension new tab, `lastRead` (surah + ayah) persisted so reopening resumes where you left off.

**Azkar** — Hisn al-Muslim corpus (266 items — 1 item dropped for having no Arabic text, documented in code/tests rather than guessed), `AzkarScheduleEditor` for per-category remap/mute/custom-time, tally counter with tap-bounce + one-time gold-bloom completion animation.

**Notifications** — pure decision logic (`computeDueNotifications`) separated from the `chrome.alarms`/`chrome.notifications`-calling orchestration wrapper, so scheduling correctness is unit-testable without a real browser. 1-minute background alarm tick.

**Extension badge** — `computeBadgeState` (pure): shows minutes/hours to next prayer on the toolbar icon, teal normally, henna inside the last 15 minutes. Shares `nextPrayer()` with the countdown widget (single source of truth).

**i18n** — `packages/ui/src/i18n` (English + Arabic), `LanguageProvider`/`useTranslation()`/`translate()`, `LanguageSwitcher` component. Every shared component (Qibla compass, nav, prayer settings, popup) reads strings through `t(...)` rather than hardcoded English. ~130+ translation keys.

**Routing** — `apps/web` restructured from a single-page app into `HashRouter`-based pages: Home, Prayer, Qibla, Quran, Azkar, each with a persistent `Nav`. Extension keeps its separate popup/new-tab entry points (no router needed there).

**Design system** — manuscript-derived identity in `packages/ui/src/styles.css`: parchment/indigo-night palette, gold-leaf reserved for completion moments only, teal-tile working accent, henna for time-critical states, Amiri for Quran-script Arabic vs. Cairo for UI Arabic, Fraunces (display) + Inter (body/UI) for Latin script. Global `prefers-reduced-motion` kill-switch. Motion is deliberately scoped to three meaningful moments (Qibla lock ripple, azkar tally bounce + bloom, verse-of-the-day reveal) — not generic hover/fade effects everywhere. CSS-only, no animation library.

**Storage** — single `Store` interface, `IndexedDbStore` (Dexie, web) and `ChromeSyncStore` (extension) adapters, JSON export/import for manual backup, `withDefaultSettings()` helper to safely merge partial/older stored settings with current defaults.

**Bundle size** — verified fixed, not just patched: Quran verse text and the GeoNames city list are lazy `import()`-loaded per-surah/on-search rather than eagerly bundled, keeping the PWA precache under Workbox's default 2MB-per-file limit. Confirmed by direct inspection of built output.

**Extension popup "continue reading" shortcut** — the popup links straight to the web app's Quran page (`${MANARAH_WEB_URL}#/quran`). It deliberately doesn't try to preview *which* surah — the popup's `chrome.storage.sync` and the web app's `IndexedDB` are separate stores with no bridge between them, so any preview shown in the popup would either be stale or fabricated. The web app already resumes to `settings.lastRead` itself on load, so the link alone delivers the "continue where I left off" behavior correctly.

**Tests** — 157 tests passing across all 4 packages (`core` 50, `storage` 17, `data` 23, `ui` 67) as of this writing. Both `pnpm --filter web build` and `pnpm --filter extension build` succeed cleanly (`tsc --noEmit` + `vite build`).

## Explicitly deferred (decided with the user, not started)

- Three-column desktop reader layout (index / page / marginalia) + "immersive reader" mode that hides chrome on scroll.
- Prayer-time-driven ambient background gradient (Fajr → indigo, Dhuhr → neutral, Asr → amber, ...).
- Hand-drawn geometric icon set (rub el-hizb/star motifs) replacing inline SVGs.
- Sound effects (tasbih click, completion chime) — needs asset sourcing + an audio-preference setting.
- Native mobile widgets (iOS Live Activities / Android Dynamic Island) — needs a native Capacitor target, which reopens the App Store/Play Store fee question.
- Cross-device sync beyond local storage (e.g. GitHub Gist) — deliberately out of scope to preserve the zero-server constraint; storage layer is designed so this could be added later without a rewrite, but it is not planned.
- KFGQPC Uthmanic Script HAFS font — no verified, licensed, freely-linkable source found; Amiri is the substitute and this is not expected to change without a real source turning up.

## Known gaps / real next steps

- **`packages/core/hijri`** — referenced in the original architecture (Hijri calendar, Ramadan/Eid/Ashura reminders) but no logic exists yet. Phase 3 item, entirely unstarted.
- **E2E/browser testing (Playwright)** — blocked in the current local dev environment (Chromium fails to launch, looks like a machine-level restriction). Deferred to CI (GitHub Actions Linux runners don't hit this), not abandoned. Not yet wired into `ci.yml`.
- **Visual verification** — no working browser in this environment; all styling/motion work has been verified by inspecting built CSS/JS output, not by looking at rendered pixels. The user's own screenshots remain the real verification step for anything visual.

## Phase 2/3 roadmap (unstarted)

Radio module (MP3Quran.net catalog + live streams), memorization/hifz mode (mic-based recitation tracking via `MediaRecorder`/`SpeechRecognition`), multi-translation/multi-tafsir library (Ibn Kathir, Tabari, Qurtubi, Saadi, Jalalayn), hadith library (sunnah.com, six canonical collections), Hijri calendar + Zakat calculator + Khatmah reading-plan generator, desktop shell (Tauri), mobile shell (Capacitor). See the fuller original plan for source/API details on each of these — nothing here has changed since it was drafted, only Phase 1 work has landed so far.

## Conventions for anyone (human or LLM) picking this up

- Pure decision logic goes in `packages/core`, kept free of `chrome.*`/DOM calls, with a thin platform-specific wrapper injecting those calls — this is what makes notification/badge logic unit-testable. Keep following this pattern for new platform-integrated features.
- Every new dataset or data-derived function gets a data-integrity test (exact counts, no empty required fields) — two real bugs (a missing-Arabic-text azkar item, unsearchable Mecca/Medina) were caught this way before shipping.
- No new runtime dependencies for things CSS can already do (this is why there's no Framer Motion/Rive here).
- Don't guess a font/API URL if you can't verify it's licensed and reachable — substitute a verified alternative and say so explicitly, as was done for KFGQPC → Amiri.
- Commits and PRs in this repo must never carry Claude/Anthropic attribution.
