/**
 * Per-verse personal annotations — bookmarks and free-text notes — kept as
 * one map under a single Store key, so they ride along with the existing
 * JSON export/import backup for free. Pure functions only: every update
 * returns a new map and never mutates its input, and `now` is injected
 * rather than read from the clock, so this is fully unit-testable.
 */

export interface VerseAnnotation {
  surah: number;
  ayah: number;
  bookmarked: boolean;
  /** Free-text personal note; absent (not empty) when there is none. */
  note?: string;
  /** ISO timestamp of the last change to this verse's bookmark or note. */
  updatedAt: string;
}

/** Keyed by `verseKey(surah, ayah)`, e.g. "2:255". */
export type VerseAnnotations = Record<string, VerseAnnotation>;

export const VERSE_ANNOTATIONS_STORAGE_KEY = "manarah:verse-annotations";

export function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function getAnnotation(annotations: VerseAnnotations, surah: number, ayah: number): VerseAnnotation | undefined {
  return annotations[verseKey(surah, ayah)];
}

/** Writes `annotation` back, or drops the entry entirely once it carries neither a bookmark nor a note — keeps the stored map from accumulating empty rows. */
function withAnnotation(annotations: VerseAnnotations, annotation: VerseAnnotation): VerseAnnotations {
  const key = verseKey(annotation.surah, annotation.ayah);
  const next = { ...annotations };
  if (!annotation.bookmarked && annotation.note === undefined) delete next[key];
  else next[key] = annotation;
  return next;
}

export function toggleBookmark(
  annotations: VerseAnnotations,
  surah: number,
  ayah: number,
  now: Date
): VerseAnnotations {
  const existing = getAnnotation(annotations, surah, ayah);
  return withAnnotation(annotations, {
    surah,
    ayah,
    note: existing?.note,
    bookmarked: !existing?.bookmarked,
    updatedAt: now.toISOString(),
  });
}

/** Sets a verse's note; a blank/whitespace-only note removes it. */
export function setNote(
  annotations: VerseAnnotations,
  surah: number,
  ayah: number,
  note: string,
  now: Date
): VerseAnnotations {
  const existing = getAnnotation(annotations, surah, ayah);
  const trimmed = note.trim();
  return withAnnotation(annotations, {
    surah,
    ayah,
    bookmarked: existing?.bookmarked ?? false,
    note: trimmed === "" ? undefined : trimmed,
    updatedAt: now.toISOString(),
  });
}

/** Every verse that is bookmarked or has a note, in mushaf order (surah, then ayah). */
export function listAnnotations(annotations: VerseAnnotations): VerseAnnotation[] {
  return Object.values(annotations).sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
}

/**
 * Plain-text form of a verse for copy/share: the Arabic text, an optional
 * translation line, and a "(Surah name surah:ayah)" citation — so a pasted
 * verse is never left without its reference.
 */
export function formatVerseForSharing(
  verse: { surah: number; ayah: number; uthmaniText: string },
  surahName: string,
  translation?: string
): string {
  const lines = [verse.uthmaniText];
  if (translation) lines.push(translation);
  lines.push(`(${surahName} ${verseKey(verse.surah, verse.ayah)})`);
  return lines.join("\n\n");
}
