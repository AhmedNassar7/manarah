import { useSyncExternalStore } from "react";
import { installPlatform, type InstallPlatform } from "@manarah/core";

/**
 * Where the app stands on installing. Chrome and Edge (on Android and computers) offer the
 * install by firing `beforeinstallprompt` — which can happen before the page's code has
 * finished starting, so the listener is attached when this module loads, and the event is kept
 * until the person presses Install. Everywhere else (an iPhone, Firefox, Safari) there is no
 * such event, and the person is shown the steps instead (see InstallGuide in @manarah/ui).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  platform: InstallPlatform;
  /** The browser has offered to install and a button can do it. */
  canPrompt: boolean;
  /** Running as an installed app already (or has just been installed). */
  installed: boolean;
}

const platform: InstallPlatform = typeof navigator !== "undefined" ? installPlatform(navigator.userAgent, navigator.maxTouchPoints) : "desktop";

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

function runningAsApp(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.matchMedia?.("(display-mode: window-controls-overlay)").matches;
  return standalone === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function compute(): InstallState {
  return { platform, canPrompt: deferred !== null, installed: justInstalled || runningAsApp() };
}

let snapshot = compute();

function emit() {
  snapshot = compute();
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep it for our own button instead of the browser's mini-bar
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

/** Starts the browser's own install, when it has offered one. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null; // an offer can be used once
  emit();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      justInstalled = true;
      emit();
    }
  } catch {
    // The person closed it, or the browser refused: nothing to do.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useInstall(): InstallState & { prompt: () => Promise<void> } {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { ...state, prompt: promptInstall };
}
