import { describe, expect, it } from "vitest";
import rawCss from "./styles.css?raw";

/**
 * The colour tokens are the one place readability is decided: every component
 * takes its text and background from them. So this reads the real stylesheet
 * and checks, for every theme, that the pairs people actually read (text on
 * the page, on a card, on a tinted or sunken area) meet WCAG AA (4.5:1) —
 * a theme that quietly drops under it would make every screen harder to read.
 */
const css = rawCss.replace(/\r\n/g, "\n");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

function tokens(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block(selector).matchAll(/--([a-z-]+): (#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
function luminance(hex: string): number {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(channel(hex, 0)) + 0.7152 * f(channel(hex, 1)) + 0.0722 * f(channel(hex, 2));
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const base = tokens(":root");
const dark = { ...base, ...tokens(':root[data-theme="dark"]') };
// "Parchment" is the base light theme and "Midnight" the dark one; the others are palettes laid over light (AMOLED over dark).
const themes: Record<string, Record<string, string>> = {
  light: base,
  dark,
  emerald: { ...base, ...tokens(':root[data-palette="emerald"]') },
  ocean: { ...base, ...tokens(':root[data-palette="ocean"]') },
  rose: { ...base, ...tokens(':root[data-palette="rose"]') },
  amoled: { ...dark, ...tokens(':root[data-palette="amoled"]') },
};

/** [text token, background token]: the pairs the interface actually puts together. */
const PAIRS: Array<[string, string]> = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["muted", "surface-sunken"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["accent", "accent-soft"],
  ["accent-ink", "accent"],
  ["gold-ink", "surface"],
];

describe("colour tokens", () => {
  for (const [name, t] of Object.entries(themes)) {
    describe(name, () => {
      for (const [fg, bg] of PAIRS) {
        it(`${fg} on ${bg} is at least 4.5:1`, () => {
          expect(t[fg], `--${fg} is defined`).toBeDefined();
          expect(t[bg], `--${bg} is defined`).toBeDefined();
          expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }

  it("keeps the progress card's white text readable at both ends of its gradient", () => {
    const m = css.match(/\.progress-card \{[^}]*linear-gradient\(135deg, (#[0-9a-f]{6}) 0%, (#[0-9a-f]{6}) 55%, (#[0-9a-f]{6}) 100%\)/);
    expect(m).not.toBeNull();
    for (const stop of m!.slice(1)) expect(contrast("#fffaf0", stop)).toBeGreaterThanOrEqual(4.5);
  });
});
