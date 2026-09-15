import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.js";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// registerType: "autoUpdate" already reloads automatically once a new
// service worker is found — but browsers only check for one on navigation.
// A tab left open across several deploys (exactly what happened during
// development: the UI looked "blank"/stale because an old SW kept serving
// old cached assets) never notices otherwise. Polling explicitly bounds the
// staleness window to this interval instead of "until the user manually
// reloads or clears site data."
registerSW({
  immediate: true,
  onRegistered(registration) {
    if (!registration) return;
    setInterval(() => {
      void registration.update();
    }, UPDATE_CHECK_INTERVAL_MS);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
