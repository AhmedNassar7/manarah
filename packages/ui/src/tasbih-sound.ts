import type { TasbihSoundId } from "@manarah/core";

/**
 * The sounds of the tasbih, made in the browser with the Web Audio API — no audio files, so
 * nothing to license or download, and it works offline. There are three, all soft:
 *
 *  - **click**: a very short, dry tick — a little noise and a tiny high tone, nothing that rings.
 *  - **wood**: a bead on a bead — a few partials at the inharmonic ratios of struck wood
 *    (1 : 2.35 : 4.1), each dying away at its own speed, so it "knocks" rather than beeps.
 *  - **bell**: a soft little "ting" that fades in about a fifth of a second (measured: ~0.2 s).
 *
 * Every sound goes through a gentle low-pass filter (the harshness of a plain synthesised
 * tone lives above a few kHz), is kept quiet, and varies about 3% in pitch from bead to bead so a
 * long count does not sound like a machine. A full turn of the ring gets a soft three-note bell.
 *
 * The audio context is only created on the first sound, which is always inside a tap (browsers
 * refuse to start audio any other way), and a suspended context is resumed. Where there is no
 * Web Audio the calls do nothing: sound is an extra, never a requirement.
 */

type AudioContextFactory = () => AudioContext | undefined;

const defaultFactory: AudioContextFactory = () => {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : undefined;
};

/** Overall loudness: well below full scale. */
const MASTER = 0.6;

export type BeadSound = Exclude<TasbihSoundId, "off">;

export interface TasbihSound {
  /** One bead, in the chosen sound. */
  bead(sound: BeadSound): void;
  /** A full turn of the ring. */
  milestone(): void;
  /** Releases the audio context. */
  dispose(): void;
}

interface Partial {
  /** Frequency as a multiple of the sound's base pitch. */
  ratio: number;
  peak: number;
  /** Seconds to die away. */
  decay: number;
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

  /** A few milliseconds of noise, fading out: the "click" at the start of a knock. */
  function noiseBuffer(c: AudioContext): AudioBuffer {
    if (!noise) {
      const length = Math.max(1, Math.floor(c.sampleRate * 0.03));
      noise = c.createBuffer(1, length, c.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return noise;
  }

  /** The output of one sound: a low-pass filter into the speakers. */
  function output(c: AudioContext, cutoff: number): AudioNode {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, c.currentTime);
    filter.connect(c.destination);
    return filter;
  }

  /** One sine partial: a very short fade-in (so it never pops), then a smooth exponential fade-out. */
  function partial(c: AudioContext, out: AudioNode, hz: number, peak: number, decay: number, delay = 0) {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak * MASTER, t0 + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t0);
    osc.stop(t0 + decay + 0.02);
  }

  /** A burst of filtered noise. */
  function burst(c: AudioContext, out: AudioNode, hz: number, q: number, peak: number, seconds: number) {
    const t0 = c.currentTime;
    const source = c.createBufferSource();
    const band = c.createBiquadFilter();
    const gain = c.createGain();
    source.buffer = noiseBuffer(c);
    band.type = "bandpass";
    band.frequency.setValueAtTime(hz, t0);
    band.Q.setValueAtTime(q, t0);
    gain.gain.setValueAtTime(peak * MASTER, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(band);
    band.connect(gain);
    gain.connect(out);
    source.start(t0);
  }

  const ring = (c: AudioContext, out: AudioNode, base: number, partials: Partial[], delay = 0) =>
    partials.forEach((p) => partial(c, out, base * p.ratio, p.peak, p.decay, delay));

  const BELL: Partial[] = [
    { ratio: 1, peak: 0.3, decay: 0.34 },
    { ratio: 2, peak: 0.1, decay: 0.22 },
    { ratio: 3.01, peak: 0.04, decay: 0.14 },
  ];
  const WOOD: Partial[] = [
    { ratio: 1, peak: 0.32, decay: 0.07 },
    { ratio: 2.35, peak: 0.16, decay: 0.045 },
    { ratio: 4.1, peak: 0.06, decay: 0.028 },
  ];

  return {
    bead(sound) {
      const c = context();
      if (!c) return;
      const v = 0.97 + Math.random() * 0.06; // +/- 3%: no two beads are exactly alike
      switch (sound) {
        case "click": {
          const out = output(c, 7000);
          burst(c, out, 3000, 0.8, 0.9, 0.012);
          partial(c, out, 2000 * v, 0.25, 0.014);
          break;
        }
        case "wood": {
          const out = output(c, 5500);
          ring(c, out, 880 * v, WOOD);
          burst(c, out, 1600, 1.2, 0.08, 0.008);
          break;
        }
        case "bell": {
          const out = output(c, 6000);
          ring(c, out, 784 * v, BELL);
          break;
        }
      }
    },
    milestone() {
      const c = context();
      if (!c) return;
      const out = output(c, 6000);
      // G5, C6, E6 — a soft rising chord, one note after another.
      [784, 1047, 1319].forEach((hz, i) => ring(c, out, hz, BELL.map((p) => ({ ...p, peak: p.peak * 0.8, decay: p.decay * 2 })), i * 0.1));
    },
    dispose() {
      const c = ctx;
      ctx = undefined;
      noise = undefined;
      if (c && c.state !== "closed") void c.close?.().catch?.(() => {});
    },
  };
}
