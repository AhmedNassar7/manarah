import { describe, expect, it, vi } from "vitest";
import { createTasbihSound } from "./tasbih-sound.js";

/** Just enough of the Web Audio API to see what a sound is made of. */
function fakeContext(state: AudioContextState = "running") {
  const log = {
    oscillators: [] as Array<{ type: string; hz: number; started: boolean; stopped: boolean }>,
    noises: 0,
    filters: [] as Array<{ type: string; hz: number }>,
    peaks: [] as number[],
    connectedToDestination: 0,
  };
  const destination = {};
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 });
  const ctx = {
    state,
    currentTime: 0,
    sampleRate: 8000,
    destination,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createGain: () => {
      const gain = param();
      gain.linearRampToValueAtTime = vi.fn((v: number) => void log.peaks.push(v));
      gain.setValueAtTime = vi.fn((v: number) => void log.peaks.push(v));
      return { gain, connect: vi.fn() };
    },
    createOscillator: () => {
      const entry = { type: "", hz: 0, started: false, stopped: false };
      log.oscillators.push(entry);
      const frequency = param();
      frequency.setValueAtTime = vi.fn((hz: number) => void (entry.hz = hz));
      return {
        set type(value: string) {
          entry.type = value;
        },
        frequency,
        connect: vi.fn(),
        start: vi.fn(() => void (entry.started = true)),
        stop: vi.fn(() => void (entry.stopped = true)),
      };
    },
    createBufferSource: () => {
      log.noises++;
      return { buffer: null, connect: vi.fn(), start: vi.fn() };
    },
    createBiquadFilter: () => {
      const entry = { type: "", hz: 0 };
      log.filters.push(entry);
      const frequency = param();
      frequency.setValueAtTime = vi.fn((hz: number) => void (entry.hz = hz));
      return {
        set type(v: string) {
          entry.type = v;
        },
        frequency,
        Q: param(),
        connect: vi.fn((to: unknown) => {
          if (to === destination) log.connectedToDestination++;
        }),
      };
    },
  };
  return { ctx: ctx as unknown as AudioContext, raw: ctx, log };
}

const sounds = ["click", "wood", "bell"] as const;

describe("createTasbihSound", () => {
  it("starts and stops every tone it makes, and every sound reaches the speakers through one low-pass filter", () => {
    for (const kind of sounds) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(kind);
      expect(log.oscillators.length, kind).toBeGreaterThanOrEqual(1);
      for (const o of log.oscillators) {
        expect(o.started, kind).toBe(true);
        expect(o.stopped, kind).toBe(true);
      }
      expect(log.filters.filter((f) => f.type === "lowpass"), kind).toHaveLength(1);
      expect(log.connectedToDestination, kind).toBe(1);
    }
  });

  it("gives each sound its own character", () => {
    const made = Object.fromEntries(
      sounds.map((kind) => {
        const { ctx, log } = fakeContext();
        createTasbihSound(() => ctx).bead(kind);
        return [kind, log];
      }),
    );
    // click: a tick (noise and one tiny tone); wood: three partials of a knock; bell: a soft ring.
    expect(made.click.noises).toBeGreaterThanOrEqual(1);
    expect(made.click.oscillators).toHaveLength(1);
    expect(made.wood.oscillators).toHaveLength(3);
    expect(made.bell.oscillators).toHaveLength(3);
    // The wood partials sit at the inharmonic ratios of struck wood, not at 2x, 3x…
    const [a, b, c] = made.wood.oscillators.map((o) => o.hz);
    expect(b / a).toBeCloseTo(2.35, 1);
    expect(c / a).toBeCloseTo(4.1, 1);
    // …while the bell's overtones are (nearly) harmonic.
    const [f, g] = made.bell.oscillators.map((o) => o.hz);
    expect(g / f).toBeCloseTo(2, 1);
  });

  it("filters off the harsh top: the low-pass cut-off is at most 7 kHz for every sound", () => {
    for (const kind of sounds) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(kind);
      const low = log.filters.find((f) => f.type === "lowpass")!;
      expect(low.hz, kind).toBeLessThanOrEqual(7000);
    }
  });

  it("keeps every tone below the shrill range: nothing above 4 kHz", () => {
    for (const kind of sounds) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(kind);
      for (const o of log.oscillators) expect(o.hz, `${kind} ${o.hz}`).toBeLessThan(4000);
    }
  });

  it("keeps every envelope well below full scale (the noise click loses most of its level in its band-pass filter; the real, rendered peak of each sound was measured separately and is under 0.3)", () => {
    for (const kind of sounds) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(kind);
      expect(Math.max(...log.peaks), kind).toBeLessThanOrEqual(0.6);
    }
    const { ctx, log } = fakeContext();
    createTasbihSound(() => ctx).milestone();
    expect(Math.max(...log.peaks)).toBeLessThanOrEqual(0.35);
  });

  it("varies the pitch a little from one bead to the next, within a few per cent", () => {
    const pitches: number[] = [];
    for (let i = 0; i < 30; i++) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead("wood");
      pitches.push(log.oscillators[0].hz);
    }
    expect(new Set(pitches).size).toBeGreaterThan(5);
    for (const p of pitches) {
      expect(p).toBeGreaterThan(880 * 0.96);
      expect(p).toBeLessThan(880 * 1.04);
    }
  });

  it("marks a full turn of the ring with a soft three-note bell (G, C, E)", () => {
    const { ctx, log } = fakeContext();
    createTasbihSound(() => ctx).milestone();
    // three notes, each with its partials: the first partial of each is the note
    const notes = log.oscillators.filter((_, i) => i % 3 === 0).map((o) => Math.round(o.hz));
    expect(notes).toEqual([784, 1047, 1319]);
  });

  it("wakes a context the browser left suspended — audio may only start inside a tap", () => {
    const { ctx, raw } = fakeContext("suspended");
    createTasbihSound(() => ctx).bead("wood");
    expect(raw.resume).toHaveBeenCalled();
  });

  it("creates the audio context only when the first sound is wanted, then reuses it", () => {
    const { ctx } = fakeContext();
    const factory = vi.fn(() => ctx);
    const sound = createTasbihSound(factory);
    expect(factory).not.toHaveBeenCalled();
    sound.bead("wood");
    sound.bead("bell");
    sound.milestone();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("does nothing, quietly, where the browser has no Web Audio", () => {
    const sound = createTasbihSound(() => undefined);
    expect(() => {
      sound.bead("wood");
      sound.milestone();
      sound.dispose();
    }).not.toThrow();
  });

  it("does nothing, quietly, if creating the audio context fails", () => {
    const sound = createTasbihSound(() => {
      throw new Error("blocked");
    });
    expect(() => sound.bead("click")).not.toThrow();
  });

  it("closes the audio context when released", () => {
    const { ctx, raw } = fakeContext();
    const sound = createTasbihSound(() => ctx);
    sound.bead("wood");
    sound.dispose();
    expect(raw.close).toHaveBeenCalled();
  });
});
