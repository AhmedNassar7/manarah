import { describe, expect, it } from "vitest";

/*
 * Guard for the iconography rule: no emoji (and no text-glyph stand-ins for
 * icons, like ▶ ⏸ ⋯ ↻) in UI source or in translated strings. Icons come
 * from the Icon component, so they follow the palette, dark mode and RTL.
 * Typographic characters that are text, not icons (the multiplication sign
 * in "2×", the minus in "−", the Quranic ornament brackets) are allowed.
 * Comments may use arrows and symbols freely — only rendered text counts.
 *
 * Source is read with Vite's import.meta.glob (raw text) rather than node:fs,
 * so this package needs no Node typings.
 */
declare global {
  interface ImportMeta {
    glob(patterns: string[], options: { query: string; import: string; eager: true }): Record<string, string>;
  }
}

const sources = import.meta.glob(
  [
    "../**/*.{ts,tsx}",
    "../../../../apps/web/src/**/*.{ts,tsx}",
    "../../../../apps/extension/src/**/*.{ts,tsx}",
    "../../../data/src/**/*.{ts,tsx}",
    "../../../core/src/**/*.{ts,tsx}",
    "!../**/*.test.{ts,tsx}",
    "!../../../../apps/**/*.test.{ts,tsx}",
    "!../../../data/src/**/*.test.{ts,tsx}",
    "!../../../core/src/**/*.test.{ts,tsx}",
  ],
  { query: "?raw", import: "default", eager: true }
);

// Emoji blocks, dingbats, misc symbols, media-control symbols, arrows, geometric shapes, and ⋯/⌄ stand-ins.
const FORBIDDEN =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{22EF}\u{2304}]/u;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
// "code; // note" — needs whitespace before the slashes so "https://…" inside a string is untouched.
const TRAILING_COMMENT = /\s\/\/\s.*$/;

function findOffenders(files: Record<string, string>): string[] {
  const offenders: string[] = [];
  for (const [file, text] of Object.entries(files)) {
    text.split(/\r?\n/).forEach((line, index) => {
      if (COMMENT_LINE.test(line)) return;
      const match = FORBIDDEN.exec(line.replace(TRAILING_COMMENT, ""));
      if (match) offenders.push(`${file}:${index + 1} ${JSON.stringify(match[0])}`);
    });
  }
  return offenders;
}

describe("no emoji or glyph stand-ins for icons", () => {
  it("scans UI, web, extension, data and core source (including the translation dictionaries)", () => {
    const files = Object.keys(sources);
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.endsWith("i18n/translations.ts"))).toBe(true);
    expect(files.some((f) => f.includes("apps/web/src"))).toBe(true);
    expect(files.some((f) => f.endsWith("data/src/azkar/sections.ts"))).toBe(true);
    expect(files.some((f) => f.includes(".test."))).toBe(false);
  });

  it("finds none", () => {
    expect(findOffenders(sources), "use <Icon name=… /> instead").toEqual([]);
  });

  it("would catch one (the pattern itself works)", () => {
    for (const bad of ["🕋", "📍", "▶", "⏸", "⋯", "↻", "→", "✓"]) expect(FORBIDDEN.test(bad), bad).toBe(true);
    for (const fine of ["2×", "−", "﴿١﴾", "·", "—", "…", "العربية"]) expect(FORBIDDEN.test(fine), fine).toBe(false);
    expect(findOffenders({ "z.ts": "const a = 1; // ى → ي" })).toEqual([]);
    expect(findOffenders({ "z.ts": 'const a = "→"; // fine' })).toEqual(['z.ts:1 "→"']);
    expect(findOffenders({ "x.tsx": "<b>🕋</b>", "y.tsx": "// → comment\n<b>ok</b>" })).toEqual(['x.tsx:1 "🕋"']);
  });
});
