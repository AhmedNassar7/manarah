import { useId, useState } from "react";
import type { AzkarVirtue } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface VirtueDropdownProps {
  /** The virtues of this dhikr; nothing is drawn when there are none. */
  virtues: AzkarVirtue[];
  /** Whether to show the English meaning under the Arabic (the Arabic is always shown). */
  showMeaning: boolean;
}

/**
 * "Its virtue": a dropdown under a dhikr that opens to what the Prophet said about it — his
 * own words from Sahih al-Bukhari or Sahih Muslim, in Arabic, with the book and number — to
 * encourage and confirm. Closed by default so the dhikr stays the thing you read. Only where
 * a firmly established hadith exists is there a dropdown at all (see the data's virtues.ts
 * for how entries are sourced and why there are few); the panel says so, so no one takes the
 * absence of a dropdown for the absence of reward.
 */
export function VirtueDropdown({ virtues, showMeaning }: VirtueDropdownProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (virtues.length === 0) return null;

  return (
    <div className="virtue" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <button type="button" className="virtue-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <Icon name="sparkles" size={16} />
        <span>{t("virtue.title")}</span>
        <Icon name="chevron-down" size={16} className="virtue-chevron" />
      </button>
      {open && (
        <div id={panelId} className="virtue-panel" role="region" aria-label={t("virtue.title")}>
          {virtues.map((v) => (
            <figure className="virtue-item" key={v.id}>
              <blockquote dir="rtl" lang="ar">
                «{v.arabic}»
              </blockquote>
              {showMeaning && (
                <p className="virtue-meaning" dir="ltr" lang="en">
                  {v.meaning}
                </p>
              )}
              <figcaption>
                {t("virtue.sourceLine", {
                  source: t(`virtue.source.${v.collection}`),
                  book: language === "ar" ? v.bookTitleAr : v.bookTitle,
                  number: v.number,
                })}
              </figcaption>
            </figure>
          ))}
          <p className="virtue-note">{t("virtue.note")}</p>
        </div>
      )}
    </div>
  );
}
