import type { IconNode } from "./types.js";

/*
 * Hand-drawn domain icons — the ones no general icon library has. Same
 * rules as the vendored Lucide set so the two read as one family: 24×24 grid,
 * drawn with strokes only (the component supplies stroke width 1.75, round
 * caps and joins, currentColor), 2px of padding, no fills.
 */

// Beads of a tasbih: a ring of 7 small beads, a larger guide bead at the
// bottom, and the tassel hanging from it. Bead centres sit on a circle of
// radius 6.5 around (12, 10) at 45° steps, skipping 90° (straight down),
// which is where the guide bead goes.
const BEAD_ANGLES = [0, 45, 135, 180, 225, 270, 315];
const beads: IconNode = BEAD_ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return [
    "circle",
    { cx: (12 + 6.5 * Math.cos(rad)).toFixed(2), cy: (10 + 6.5 * Math.sin(rad)).toFixed(2), r: "1.5" },
  ];
});

export const CUSTOM_ICONS = {
  /** A mosque: dome with finial between two minarets, arched door. Echoes the logo's tower. */
  mosque: [
    ["path", { d: "M2 21V9l1.5-3L5 9v12" }],
    ["path", { d: "M19 21V9l1.5-3L22 9v12" }],
    ["path", { d: "M5 21v-7h14v7" }],
    ["path", { d: "M7 14a5 5 0 0 1 10 0" }],
    ["path", { d: "M12 9V5" }],
    ["path", { d: "M10.5 21v-3a1.5 1.5 0 0 1 3 0v3" }],
    ["path", { d: "M1 21h22" }],
  ],

  /** The Kaaba: a cube seen in slight perspective, with its kiswa band and door. Also the marker on the Qibla compass. */
  kaaba: [
    ["path", { d: "M4 9.5h12V21H4z" }], // front face
    ["path", { d: "M4 9.5 8 4.5h12l-4 5" }], // top face
    ["path", { d: "M20 4.5V16l-4 5" }], // side face
    ["path", { d: "M4 13h12" }], // kiswa band (front)
    ["path", { d: "M16 13l4-4.5" }], // kiswa band (side)
    ["path", { d: "M9.5 21v-4h3v4" }], // door
  ],

  /** Qibla: a compass ring, open at the top where a small Kaaba sits, with a navigation-arrow needle pointing to it. */
  qibla: [
    ["path", { d: "M15.3 5.67A8.5 8.5 0 1 1 8.7 5.67" }],
    ["rect", { x: "9.5", y: "1.8", width: "5", height: "5", rx: "0.8" }],
    ["path", { d: "M9.5 3.9h5" }],
    ["path", { d: "M12 10.5l3 7H9z" }],
  ],

  /** The Quran: an open book resting on a rehal (folding stand). */
  quran: [
    ["path", { d: "M12 6.5C10.5 5.2 8.3 4.5 5 4.5v10.5c3.3 0 5.5.7 7 2 1.5-1.3 3.7-2 7-2V4.5c-3.3 0-5.5.7-7 2z" }],
    ["path", { d: "M12 6.5V17" }],
    ["path", { d: "M8 21.5l4-4.5 4 4.5" }],
  ],

  /** Radio: a dot with a pair of waves on each side — a station broadcasting. */
  radio: [
    ["circle", { cx: "12", cy: "12", r: "2" }],
    ["path", { d: "M16.2 7.8a6 6 0 0 1 0 8.4" }],
    ["path", { d: "M7.8 16.2a6 6 0 0 1 0-8.4" }],
    ["path", { d: "M19.1 4.9a10 10 0 0 1 0 14.2" }],
    ["path", { d: "M4.9 19.1a10 10 0 0 1 0-14.2" }],
  ],

  /** Azkar: a tasbih — a loop of beads with a guide bead and tassel. */
  tasbih: [
    ...beads,
    ["circle", { cx: "12", cy: "16.5", r: "1.9" }],
    ["path", { d: "M12 18.4V22" }],
  ],
} satisfies Record<string, IconNode>;
