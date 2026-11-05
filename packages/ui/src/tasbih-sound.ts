import type { TasbihTimbre } from "@manarah/core";

/**
 * The sounds of the tasbih, made in the browser with the Web Audio API — no audio
 * files, so nothing to license, nothing to download, and it works offline. Each bead
 * is a very short, quiet knock whose character follows the material of the beads
 * (wood knocks, glass ticks, stone clacks, amber is soft), varied a hair in pitch
 * each time so a long count does not sound like a machine. Finishing a round is a
 * gentle three-note chime.
 *
 * The audio context is only created on the first sound, which is always inside a tap
 * (browsers refuse to start audio any other way), and a suspended context is resumed.
 * If the browser has no Web Audio the calls do nothing: sound is an extra, never a
 * requirement.
 */

type AudioContextFactory = () => AudioContext | undefined;

const defaultFactory: AudioContextFactory = () => {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : undefined;
};

/** Overall loudness: the sounds are deliberately soft. */
const MASTER = 0.5;

export interface TasbihSound {
  /** One bead, in the sound of the given material. */
  bead(timbre: TasbihTimbre): void;
  /** A round complete. */
  round(): void;
  /** Releases the audio context. */
  dispose(): void;
}

export function createTasbihSound(factory: AudioContextFactory = defaultFactory): TasbihSound {
  let ctx: AudioContext | undefined;
  let noise: AudioBuffer | undefined;

  function context(): AudioContext | undefined {
    if (!ctx) {
      try {
        ctx = factory();
      } catch {
        ctx = undefined;
      }
    }
    if (ctx && ctx.state === "suspended") void ctx.resume?.().catch?.(() => {});
    return ctx;
  }

  /** A few milliseconds of noise: the "click" at the start of a knock. */
  function noiseBuffer(c: AudioContext): AudioBuffer {
    if (!noise) {
      const length = Math.max(1, Math.floor(c.sampleRate * 0.03));
      noise = c.createBuffer(1, length, c.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return noise;
  }

  /** A pitched tone that falls from `from` to `to` Hz while its loudness dies away. */
  function tone(c: AudioContext, type: OscillatorType, from: number, to: number, peak: number, seconds: number, delay = 0) {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + seconds * 0.6);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak * MASTER, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** A burst of filtered noise. */
  function click(c: AudioContext, filter: BiquadFilterType, frequency: number, q: number, peak: number) {
    const t0 = c.currentTime;
    const source = c.createBufferSource();
    const biquad = c.createBiquadFilter();
    const gain = c.createGain();
    source.buffer = noiseBuffer(c);
    biquad.type = filter;
    biquad.frequency.setValueAtTime(frequency, t0);
    biquad.Q.setValueAtTime(q, t0);
    gain.gain.setValueAtTime(peak * MASTER, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(c.destination);
    source.start(t0);
  }

  return {
    bead(timbre) {
      const c = context();
      if (!c) return;
      const v = 0.97 + Math.random() * 0.06; // +/- 3% so no two beads are exactly alike
      switch (timbre) {
        case "wood":
          tone(c, "sine", 520 * v, 300 * v, 0.55, 0.09);
          click(c, "bandpass", 2200, 6, 0.4);
          break;
        case "glass":
          tone(c, "sine", 2600 * v, 2600 * v, 0.22, 0.13);
          tone(c, "sine", 3900 * v, 3900 * v, 0.1, 0.08);
          click(c, "highpass", 4000, 1, 0.12);
          break;
        case "stone":
          tone(c, "triangle", 380 * v, 220 * v, 0.5, 0.07);
          click(c, "lowpass", 1400, 1, 0.35);
          break;
        case "soft":
          tone(c, "sine", 330 * v, 260 * v, 0.4, 0.12);
          click(c, "lowpass", 900, 1, 0.12);
          break;
      }
    },
    round() {
      const c = context();
      if (!c) return;
      // G5, C6, E6 — a gentle rising chord, one note after another.
      [784, 1047, 1319].forEach((hz, i) => tone(c, "sine", hz, hz, 0.28, 0.9, i * 0.09));
    },
    dispose() {
      const c = ctx;
      ctx = undefined;
      noise = undefined;
      if (c && c.state !== "closed") void c.close?.().catch?.(() => {});
    },
  };
}
