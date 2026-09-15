<p align="center">
  <img src="assets/logo.svg" alt="Manarah logo" width="96" height="96">
</p>

<h1 align="center">Manarah (منارة)</h1>
<p align="center"><em>Lighthouse / minaret — the tower a light or a call is sent out from.</em></p>

<p align="center">
  Prayer times · Azkar &amp; dua reminders · Quran (text, audio, tafsir) · Radio · Qibla<br>
  One codebase → Chrome extension, web app (PWA), desktop &amp; mobile (planned)
</p>

<p align="center">
  <a href="https://github.com/AhmedNassar7/manarah/actions/workflows/ci.yml"><img src="https://github.com/AhmedNassar7/manarah/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/AhmedNassar7/manarah/actions/workflows/deploy-web.yml"><img src="https://github.com/AhmedNassar7/manarah/actions/workflows/deploy-web.yml/badge.svg" alt="Deploy"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-1e5c55" alt="Node >= 20">
  <img src="https://img.shields.io/badge/pnpm-workspaces-b08d3e" alt="pnpm workspaces">
</p>

## Features

<table>
  <tr>
    <td align="center" width="120">🕌<br><b>Prayer times</b></td>
    <td align="center" width="120">📿<br><b>Azkar &amp; dua</b></td>
    <td align="center" width="120">📖<br><b>Quran</b></td>
    <td align="center" width="120">📻<br><b>Radio</b></td>
    <td align="center" width="120">🧭<br><b>Qibla</b></td>
  </tr>
  <tr>
    <td align="center">Calculation<br>methods, alerts</td>
    <td align="center">Customizable<br>reminders</td>
    <td align="center">Text, audio,<br>tafsir</td>
    <td align="center">Live Quran<br>stations</td>
    <td align="center">Live compass<br>bearing</td>
  </tr>
</table>

## Why

- **Zero infrastructure** — static hosting, free public APIs, on-device storage. No server, no database.
- **One codebase, many shells** — logic in `packages/`, each app in `apps/` is a thin shell.
- **Offline-first** — PWA with a precaching service worker.

## Architecture

```mermaid
graph LR
  subgraph apps
    web["web · PWA"]
    ext["extension · MV3"]
  end
  subgraph packages
    ui["ui"]
    core["core"]
    storage["storage"]
    data["data"]
  end

  web --> ui & core & storage & data
  ext --> ui & core & storage & data
  ui --> core
  data --> core
```

| Package/App     | Role                                                          |
| ---------------- | --------------------------------------------------------------- |
| `apps/web`       | React + Vite PWA, deployed to GitHub Pages                    |
| `apps/extension` | MV3 Chrome extension (Vite + CRXJS)                            |
| `packages/core`  | Prayer times, Qibla, azkar engine, Hijri calendar             |
| `packages/ui`    | Shared React components + design system                       |
| `packages/storage`| IndexedDB (Dexie) and `chrome.storage.sync` adapters          |
| `packages/data`  | Bundled static data — calculation methods, cities, azkar       |

Desktop (Tauri) and mobile (Capacitor) are planned, not started.

## Tech stack

TypeScript (strict) · React 18 · Vite · Dexie · Vitest + Testing Library · pnpm workspaces · ESLint

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [pnpm](https://pnpm.io/) 9 or later

## Getting started

```bash
pnpm install

pnpm dev:web         # web app at http://localhost:5173
pnpm dev:extension   # builds to apps/extension/dist — load unpacked in chrome://extensions
```

## Scripts

| Script                | Runs                              |
| ---------------------- | ------------------------------------ |
| `pnpm dev:web`          | Web app dev server                  |
| `pnpm dev:extension`    | Extension in watch mode              |
| `pnpm build:web`        | Typecheck + build web app            |
| `pnpm build:extension`  | Typecheck + build extension          |
| `pnpm typecheck`        | Typecheck all packages               |
| `pnpm lint`             | Lint all packages                    |
| `pnpm -r test`          | Test all packages                    |

## Design system

Shared theme in [`packages/ui/src/styles.css`](packages/ui/src/styles.css) — one stylesheet for web, extension popup, and new-tab. Light/dark via `prefers-color-scheme`.

<p>
  <img src="https://img.shields.io/badge/ink-26221c-26221c" alt="ink">
  <img src="https://img.shields.io/badge/bg-f1e9d8-f1e9d8" alt="bg">
  <img src="https://img.shields.io/badge/accent-1e5c55-1e5c55" alt="accent">
  <img src="https://img.shields.io/badge/gold-b08d3e-b08d3e" alt="gold">
  <img src="https://img.shields.io/badge/danger-7a3b2e-7a3b2e" alt="danger">
</p>

<table>
  <tr>
    <td width="72"><img src="assets/qibla-motion.svg" alt="Qibla compass motion preview" width="64" height="64"></td>
    <td>
      <b>Motion</b> — two easings (<code>--ease-spring</code> tactile, <code>--ease-quiet</code> calm), three durations (<code>--dur-tap</code> 180ms, <code>--dur-bloom</code> 550ms, <code>--dur-needle</code> 500ms), all collapsed under <code>prefers-reduced-motion</code>. Named animations: Qibla compass ripple (preview left), azkar completion bloom/tap, verse-of-the-day reveal. Plain CSS, no animation library.
    </td>
  </tr>
</table>

## Deployment

| Workflow                                  | Trigger                          | Does                                  |
| ------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| [`ci.yml`](.github/workflows/ci.yml)         | push / PR                          | install, typecheck, test, build both apps |
| [`deploy-web.yml`](.github/workflows/deploy-web.yml) | push to `main` (web/packages) | build `apps/web` → GitHub Pages        |

Live: **https://ahmednassar7.github.io/manarah/**

## Contributing

Early stage, breaking changes expected. Issues and PRs welcome.
