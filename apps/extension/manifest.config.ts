import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Manarah",
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
  icons: {
    16: "icons/icon-16.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },
});
