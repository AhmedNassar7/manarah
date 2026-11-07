import { useSyncExternalStore } from "react";
import type { VolumeState } from "@manarah/ui";

/**
 * The app's one volume, for everything it plays — the radio, the Quran recitation, the azkar
 * recordings — kept per device. Rather than ask each player to remember to apply it, it is applied
 * where every media element passes: just before it plays, and again on every change to those that
 * are sounding. (A media element that shows the browser's own controls — the full-azkar player —
 * is left to its own volume control.) An iPhone does not let a page set the volume at all (its
 * buttons do), so there `canSet` is false and no slider is shown.
 */

const KEY = "manarah.volume";

function read(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return localStorage.getItem(KEY) !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  } catch {
    return 1;
  }
}

/** Some platforms (iOS) ignore the volume of a media element: setting 0.5 and reading it back finds out. */
function detectCanSet(): boolean {
  if (typeof Audio === "undefined") return false;
  try {
    const probe = new Audio();
    probe.volume = 0.5;
    return probe.volume === 0.5;
  } catch {
    return false;
  }
}

let volume = read();
const canSet = detectCanSet();
let snapshot: VolumeState = { volume, canSet, setVolume };
const listeners = new Set<() => void>();
const sounding = new Set<WeakRef<HTMLMediaElement>>();
const tracked = new WeakSet<HTMLMediaElement>();

function setVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
  try {
    localStorage.setItem(KEY, String(volume));
  } catch {
    // Storage blocked: the level lasts until the page closes.
  }
  for (const ref of sounding) {
    const el = ref.deref();
    if (!el) sounding.delete(ref);
    else if (!el.controls) el.volume = volume;
  }
  snapshot = { volume, canSet, setVolume };
  listeners.forEach((listener) => listener());
}

if (typeof HTMLMediaElement !== "undefined" && canSet) {
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    if (!this.controls) {
      this.volume = volume;
      if (!tracked.has(this)) {
        tracked.add(this);
        sounding.add(new WeakRef(this));
      }
    }
    return nativePlay.call(this);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useVolumeState(): VolumeState {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
