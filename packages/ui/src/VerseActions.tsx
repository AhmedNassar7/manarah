import { useEffect, useState } from "react";
import { useTranslation } from "./i18n/index.js";

export interface VerseActionsProps {
  ayah: number;
  /** Full plain-text form of the verse (text + translation + citation) used by Copy and Share. */
  shareText: string;
  bookmarked: boolean;
  note?: string;
  /** Omitted when there's nowhere to persist bookmarks — hides the bookmark button. */
  onToggleBookmark?: () => void;
  /** Omitted when there's nowhere to persist notes — hides the note button. */
  onSaveNote?: (note: string) => void;
  /** Whether this verse's tafsir panel is currently open. */
  tafsirOpen?: boolean;
  /** Omitted when no tafsir source is wired up — hides the tafsir button. */
  onToggleTafsir?: () => void;
  /** Whether this verse's word-by-word panel is currently open. */
  wordsOpen?: boolean;
  /** Omitted when no word-by-word source is wired up — hides the button. */
  onToggleWords?: () => void;
}

/** How long the "Copied" confirmation stays on the Copy button. */
const COPIED_FEEDBACK_MS = 1500;

/** Per-verse toolbar: copy, share, bookmark, tafsir, word-by-word, and a personal note. Opened from QuranReader's per-verse actions button. */
export function VerseActions({
  ayah,
  shareText,
  bookmarked,
  note,
  onToggleBookmark,
  onSaveNote,
  tafsirOpen = false,
  onToggleTafsir,
  wordsOpen = false,
  onToggleWords,
}: VerseActionsProps) {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note ?? "");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      // Clipboard access denied or unavailable (e.g. insecure context) — nothing useful to show.
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ text: shareText });
    } catch {
      // The user dismissing the share sheet rejects with AbortError — not an error worth surfacing.
    }
  }

  function startEditingNote() {
    setNoteDraft(note ?? "");
    setEditingNote(true);
  }

  function saveNote() {
    onSaveNote?.(noteDraft);
    setEditingNote(false);
  }

  return (
    <div className="verse-actions" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="verse-actions-buttons">
        <button type="button" onClick={handleCopy}>
          {copied ? t("verseActions.copied") : t("verseActions.copy")}
        </button>
        {canShare && (
          <button type="button" onClick={handleShare}>
            {t("verseActions.share")}
          </button>
        )}
        {onToggleBookmark && (
          <button type="button" aria-pressed={bookmarked} onClick={onToggleBookmark}>
            {bookmarked ? t("verseActions.removeBookmark") : t("verseActions.bookmark")}
          </button>
        )}
        {onToggleTafsir && (
          <button type="button" aria-pressed={tafsirOpen} onClick={onToggleTafsir}>
            {tafsirOpen ? t("verseActions.hideTafsir") : t("verseActions.tafsir")}
          </button>
        )}
        {onToggleWords && (
          <button type="button" aria-pressed={wordsOpen} onClick={onToggleWords}>
            {wordsOpen ? t("verseActions.hideWords") : t("verseActions.words")}
          </button>
        )}
        {onSaveNote && !editingNote && (
          <button type="button" onClick={startEditingNote}>
            {note ? t("verseActions.editNote") : t("verseActions.addNote")}
          </button>
        )}
      </div>
      {editingNote && (
        <div className="verse-actions-note-editor">
          <textarea
            aria-label={t("verseActions.noteLabel", { ayah })}
            placeholder={t("verseActions.notePlaceholder")}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="verse-actions-buttons">
            <button type="button" className="verse-actions-primary" onClick={saveNote}>
              {t("verseActions.saveNote")}
            </button>
            <button type="button" onClick={() => setEditingNote(false)}>
              {t("verseActions.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
