import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Quran & Muslim Companion",
  description:
    "Prayer times, customizable azkar reminders, Quran reading/audio/tafsir, radio, and Qibla.",
  version: packageJson.version,
  action: {
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["storage", "alarms", "notifications", "geolocation"],
  // TODO: add icons/icon-{16,48,128}.png and reference them here before
  // loading unpacked / submitting to the Chrome Web Store. Omitted for now
  // so the scaffold builds without placeholder art.
});
