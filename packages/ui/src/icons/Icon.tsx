import { createElement } from "react";
import { CUSTOM_ICONS } from "./custom.js";
import { LUCIDE_ICONS } from "./lucide.js";
import type { IconNode } from "./types.js";

export const ICONS = { ...LUCIDE_ICONS, ...CUSTOM_ICONS } satisfies Record<string, IconNode>;
export type IconName = keyof typeof ICONS;

/** Type guard for icon names that arrive as plain strings (e.g. from data files). */
export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/** Icons that point somewhere: they flip in right-to-left layouts, so "forward" always points the reading direction. Media controls deliberately don't — play/skip keep their orientation in every language. */
const DIRECTIONAL: ReadonlySet<IconName> = new Set<IconName>(["arrow-right", "arrow-left", "chevron-left", "chevron-right"]);

/** The three sizes the design uses: 16 beside text, 20 in buttons, 24 in navigation. */
export type IconSize = 16 | 20 | 24;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  /** Fills the shape with the current colour — the "on" state of a toggle such as a bookmark. */
  filled?: boolean;
  className?: string;
  /** Accessible name. Omit when the icon sits beside a visible label or inside a button that already has an aria-label — the icon is then hidden from assistive tech. */
  title?: string;
}

/** Draws an icon as a <g> inside an existing <svg> (e.g. the Kaaba marker on the Qibla dial), centred on (cx, cy) at `size` user units. */
export function IconInSvg({ name, cx, cy, size }: { name: IconName; cx: number; cy: number; size: number }) {
  const node = ICONS[name] as IconNode;
  const scale = size / 24;
  return (
    <g
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </g>
  );
}

/**
 * One inline SVG icon from the app's icon set. Drawn on a 24×24 grid with a
 * 1.75 stroke, round caps/joins, and `currentColor`, so it takes whatever
 * colour the surrounding text has (muted at rest, accent on hover/pressed)
 * and follows dark mode for free. Inline, so it works offline in the PWA
 * and the extension with no extra requests.
 */
export function Icon({ name, size = 20, filled = false, className, title }: IconProps) {
  const node = ICONS[name] as IconNode;
  const classes = ["icon", DIRECTIONAL.has(name) ? "icon-directional" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      {title && <title>{title}</title>}
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
