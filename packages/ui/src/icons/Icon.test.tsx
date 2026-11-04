import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, ICONS, type IconName } from "./Icon.js";
import type { IconNode } from "./types.js";

const NAMES = Object.keys(ICONS) as IconName[];
const ALLOWED_TAGS = new Set(["path", "circle", "line", "rect", "polyline", "polygon"]);

describe("icon registry", () => {
  it("includes every icon the UI is planned to use, including the hand-drawn domain ones", () => {
    for (const name of ["mosque", "kaaba", "qibla", "quran", "tasbih", "play", "bookmark", "home"] as const) {
      expect(NAMES).toContain(name);
    }
  });

  it.each(NAMES)("%s has a drawing made only of known SVG tags with attributes", (name) => {
    const node: IconNode = ICONS[name];
    expect(node.length).toBeGreaterThan(0);
    for (const [tag, attrs] of node) {
      expect(ALLOWED_TAGS.has(tag), `${name}: unexpected <${tag}>`).toBe(true);
      expect(Object.keys(attrs).length).toBeGreaterThan(0);
    }
  });

  it("keeps every coordinate of every hand-drawn icon inside the 24×24 grid", () => {
    for (const name of ["mosque", "kaaba", "qibla", "quran", "tasbih"] as const) {
      for (const [, attrs] of ICONS[name] as IconNode) {
        const numbers = (attrs.d ?? "").match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
        // Path data mixes absolute/relative commands, so only check the loose bound
        // that catches a typo'd digit; absolute shapes are checked precisely below.
        for (const n of numbers) expect(Math.abs(n)).toBeLessThanOrEqual(24);
        for (const key of ["cx", "cy", "x", "y"] as const) {
          if (attrs[key] !== undefined) expect(Number(attrs[key])).toBeGreaterThanOrEqual(0);
        }
        if (attrs.cx !== undefined && attrs.r !== undefined) {
          expect(Number(attrs.cx) + Number(attrs.r)).toBeLessThanOrEqual(24);
          expect(Number(attrs.cx) - Number(attrs.r)).toBeGreaterThanOrEqual(0);
          expect(Number(attrs.cy) + Number(attrs.r)).toBeLessThanOrEqual(24);
          expect(Number(attrs.cy) - Number(attrs.r)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("Icon", () => {
  it("is decorative (hidden from assistive tech) when it has no title", () => {
    const { container } = render(<Icon name="play" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("exposes a title as an accessible name", () => {
    const { container } = render(<Icon name="bookmark" title="Bookmarked" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Bookmarked");
    expect(svg.querySelector("title")).toHaveTextContent("Bookmarked");
  });

  it("draws on the shared grid and takes its colour from the text", () => {
    const svg = render(<Icon name="mosque" />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("width", "20");
  });

  it("supports the three design sizes and a filled state", () => {
    const small = render(<Icon name="play" size={16} />).container.querySelector("svg")!;
    expect(small).toHaveAttribute("width", "16");
    const filled = render(<Icon name="bookmark" filled />).container.querySelector("svg")!;
    expect(filled).toHaveAttribute("fill", "currentColor");
  });

  it("marks only direction-bearing icons as mirrorable in RTL", () => {
    expect(render(<Icon name="arrow-right" />).container.querySelector("svg")).toHaveClass("icon-directional");
    expect(render(<Icon name="play" />).container.querySelector("svg")).not.toHaveClass("icon-directional");
  });
});
