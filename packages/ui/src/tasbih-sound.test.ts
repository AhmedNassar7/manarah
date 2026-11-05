import { describe, expect, it, vi } from "vitest";
import { createTasbihSound } from "./tasbih-sound.js";

/** Just enough of the Web Audio API to see what a sound is made of. */
function fakeContext(state: AudioContextState = "running") {
  const log = { oscillators: [] as Array<{ type: string; from: number; started: boolean; stopped: boolean }>, noises: 0, filters: [] as string[], peaks: [] as number[] };
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 });
  const ctx = {
    state,
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
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
      const entry = { type: "", from: 0, started: false, stopped: false };
      log.oscillators.push(entry);
      const frequency = param();
      frequency.setValueAtTime = vi.fn((hz: number) => void (entry.from = hz));
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
      const f = { Q: param(), frequency: param(), connect: vi.fn(), set type(v: string) { log.filters.push(v); } };
      return f;
    },
  };
  return { ctx: ctx as unknown as AudioContext, raw: ctx, log };
}

describe("createTasbihSound", () => {
  it("makes a bead sound out of a tone and a click, and starts and stops every tone it makes", () => {
    const { ctx, log } = fakeContext();
    const sound = createTasbihSound(() => ctx);
    sound.bead("wood");
    expect(log.oscillators.length).toBeGreaterThanOrEqual(1);
    expect(log.noises).toBeGreaterThanOrEqual(1);
    for (const o of log.oscillators) {
      expect(o.started).toBe(true);
      expect(o.stopped).toBe(true);
    }
  });

  it("gives each material its own character", () => {
    const sounds: Record<string, { type: string; from: number }[]> = {};
    for (const timbre of ["wood", "glass", "stone", "soft"] as const) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(timbre);
      sounds[timbre] = log.oscillators.map((o) => ({ type: o.type, from: o.from }));
    }
    // Glass rings high, wood and stone knock low, and stone uses a harder wave than wood.
    expect(sounds.glass[0].from).toBeGreaterThan(2000);
    expect(sounds.wood[0].from).toBeLessThan(700);
    expect(sounds.stone[0].type).toBe("triangle");
    expect(sounds.wood[0].type).toBe("sine");
    expect(new Set(Object.values(sounds).map((s) => JSON.stringify(s.map((o) => o.type)))).size).toBeGreaterThan(1);
  });

  it("keeps every bead sound quiet: nothing is louder than half scale", () => {
    for (const timbre of ["wood", "glass", "stone", "soft"] as const) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead(timbre);
      expect(Math.max(...log.peaks)).toBeLessThanOrEqual(0.5);
    }
  });

  it("varies the pitch a little from one bead to the next, within a few per cent", () => {
    const pitches: number[] = [];
    for (let i = 0; i < 30; i++) {
      const { ctx, log } = fakeContext();
      createTasbihSound(() => ctx).bead("wood");
      pitches.push(log.oscillators[0].from);
    }
    expect(new Set(pitches).size).toBeGreaterThan(5);
    for (const p of pitches) expect(p).toBeGreaterThan(520 * 0.96);
    for (const p of pitches) expect(p).toBeLessThan(520 * 1.04);
  });

  it("finishes a round with a three-note chime", () => {
    const { ctx, log } = fakeContext();
    createTasbihSound(() => ctx).round();
    expect(log.oscillators.map((o) => Math.round(o.from))).toEqual([784, 1047, 1319]);
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
    sound.bead("glass");
    sound.round();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("does nothing, quietly, where the browser has no Web Audio", () => {
    const sound = createTasbihSound(() => undefined);
    expect(() => {
      sound.bead("wood");
      sound.round();
      sound.dispose();
    }).not.toThrow();
  });

  it("does nothing, quietly, if creating the audio context fails", () => {
    const sound = createTasbihSound(() => {
      throw new Error("blocked");
    });
    expect(() => sound.bead("wood")).not.toThrow();
  });

  it("closes the audio context when released", () => {
    const { ctx, raw } = fakeContext();
    const sound = createTasbihSound(() => ctx);
    sound.bead("wood");
    sound.dispose();
    expect(raw.close).toHaveBeenCalled();
  });
});
