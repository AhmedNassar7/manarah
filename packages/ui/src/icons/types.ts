/** SVG child elements an icon is built from — the only tags the icon set needs. */
export type IconTag = "path" | "circle" | "line" | "rect" | "polyline" | "polygon";

/** One icon: its drawing as a list of [tag, attributes], on the shared 24×24 grid. */
export type IconNode = Array<[IconTag, Record<string, string>]>;
