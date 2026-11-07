import { useSyncExternalStore } from "react";
import type { RadioStation } from "@manarah/core";
import type { RadioStatus } from "@manarah/ui";

/**
 * The radio's audio. One `<audio>` element for the whole app, kept at module level (not inside a
 * page), so a station keeps playing as the person moves between sections, and the phone's lock
 * screen and headphone buttons can pause it (Media Session). A live stream has nothing to seek to:
 * pausing stops listening, and playing again reconnects to *now* rather than resuming old buffered
 * audio. Failures are told apart — no connection (comes back by itself when the network does) and
 * a station that will not play (the person is told, and can pick another).
 */

export interface RadioPlayerState {
  stationId?: number;
  status: RadioStatus;
}

let audio: HTMLAudioElement | null = null;
let station: RadioStation | null = null;
let title = "";
let snapshot: RadioPlayerState = { status: "idle" };
const listeners = new Set<() => void>();

function set(next: RadioPlayerState) {
  snapshot = next;
  listeners.forEach((listener) => listener());
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = next.status === "playing" || next.status === "loading" ? "playing" : next.status === "idle" ? "none" : "paused";
  }
}

function setStatus(status: RadioStatus) {
  if (!station) return;
  if (snapshot.status !== status) set({ stationId: station.id, status });
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = "none";
  el.addEventListener("playing", () => setStatus("playing"));
  el.addEventListener("waiting", () => {
    if (snapshot.status === "playing") setStatus("loading");
  });
  el.addEventListener("pause", () => {
    // Our own pause() and stop() set the status first; this is for the system pausing it
    // (a phone call, headphones unplugged).
    if (snapshot.status === "playing" || snapshot.status === "loading") setStatus("paused");
  });
  el.addEventListener("error", () => {
    if (!station || !el.getAttribute("src")) return; // we cleared the source ourselves
    setStatus(navigator.onLine ? "error" : "offline");
  });
  // Two voices at once is never wanted: when anything else in the app starts playing (a verse's
  // recitation, a recorded dhikr), the radio steps aside. Done where every media element passes
  // through, rather than in each player, so a new player cannot forget it. Only once the radio has
  // been used, and the radio's own element is left alone.
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    if (this !== el && (snapshot.status === "playing" || snapshot.status === "loading")) pause();
    return nativePlay.call(this);
  };
  audio = el;
  return el;
}

// The connection coming and going — listened to from the start, not only once the audio exists,
// so "no connection" at the first tap also recovers by itself.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (snapshot.status === "offline" && station) void play(station, title);
  });
  window.addEventListener("offline", () => {
    if (snapshot.status === "playing" || snapshot.status === "loading") setStatus("offline");
  });
}

function announce(name: string) {
  if (!("mediaSession" in navigator)) return;
  const icon = (file: string) => new URL(file, document.baseURI).href;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: name,
    artist: "Manarah",
    artwork: [
      { src: icon("icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: icon("icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  });
  navigator.mediaSession.setActionHandler("play", () => void resume());
  navigator.mediaSession.setActionHandler("pause", () => pause());
  navigator.mediaSession.setActionHandler("stop", () => stop());
}

/** Starts (or restarts) a station. `name` is how it is called in the person's language, for the lock screen. */
export async function play(next: RadioStation, name: string): Promise<void> {
  station = next;
  title = name;
  if (!navigator.onLine) {
    set({ stationId: next.id, status: "offline" });
    return;
  }
  const el = element();
  set({ stationId: next.id, status: "loading" });
  el.src = next.url;
  announce(name);
  try {
    await el.play();
  } catch (error) {
    // Starting another station interrupts this one: not a failure.
    if ((error as DOMException)?.name === "AbortError") return;
    if (station?.id === next.id) setStatus(navigator.onLine ? "error" : "offline");
  }
}

export function pause(): void {
  if (!audio || !station) return;
  set({ stationId: station.id, status: "paused" });
  audio.pause();
}

/** Plays again after a pause — reconnecting to the live broadcast. */
export async function resume(): Promise<void> {
  if (station) await play(station, title);
}

/** Turns the radio off and clears it from the lock screen. */
export function stop(): void {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  station = null;
  set({ status: "idle" });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = null;
    for (const action of ["play", "pause", "stop"] as const) navigator.mediaSession.setActionHandler(action, null);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useRadioPlayer(): RadioPlayerState & { play: typeof play; pause: typeof pause; resume: typeof resume; stop: typeof stop } {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return { ...state, play, pause, resume, stop };
}
