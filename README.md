# Manarah

منارة — lighthouse / minaret: the tower a light or a call is sent out from.

Prayer times, customizable azkar/dua reminders, Quran (text/audio/tafsir), radio, and Qibla — as a Chrome extension, an installable web app, a desktop app, and a mobile app, all from one codebase. See the full plan in this session's plan file for architecture and phasing.

Zero infrastructure cost by design: static hosting (GitHub Pages) + free public APIs called directly from the client + on-device storage (IndexedDB / `chrome.storage.sync`) — no server, no database, no paid tier.

## Layout

```
apps/
  web/         React + Vite PWA
  extension/   MV3 Chrome extension (Vite + CRXJS)
  desktop/     Tauri shell (added in Phase 2)
  mobile/      Capacitor shell (added in Phase 2)
packages/
  core/        Prayer times, Qibla, azkar engine, Quran data types, Hijri calendar — platform-agnostic
  ui/          Shared React components
  storage/     Storage abstraction (IndexedDB + chrome.storage.sync adapters, JSON export/import)
  data/        Bundled static data (calculation methods; Quran text/reciters/azkar corpus to be fetched, see packages/data/src/index.ts)
```

## Getting started

```
pnpm install
pnpm dev:web         # web app at http://localhost:5173
pnpm dev:extension   # builds to apps/extension/dist — load unpacked in chrome://extensions
```
