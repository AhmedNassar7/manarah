import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildShareMessage, shareLinks } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

/** "Whoever guides to something good will have a reward like the one who does it." — reported by Muslim. */
const GUIDING_HADITH = "مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ";

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export interface SharePanelProps {
  /** The address to share — the app's own. */
  url: string;
}

/**
 * Ways to send Manarah to a friend: the device's own share sheet where there
 * is one, WhatsApp, Telegram, email, and a copied link. Nothing is collected or
 * sent to us — each of these just opens the person's own app. Above them, the
 * hadith that is the reason to: guiding to good earns the like of its reward.
 */
export function SharePanel({ url }: SharePanelProps) {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  const message = buildShareMessage(language, url);
  const links = shareLinks(message);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  async function nativeShare() {
    try {
      await navigator.share({ title: message.title, text: message.text, url: message.url });
    } catch {
      // Cancelling the share sheet is not an error worth showing.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // No clipboard access: the other options still work.
    }
  }

  return (
    <div className="share-panel" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <p className="share-intro">{t("share.intro")}</p>
      <blockquote className="share-hadith">
        <p dir="rtl" lang="ar">
          {GUIDING_HADITH}
        </p>
        {language === "en" && <p>{t("share.hadith")}</p>}
        <footer>{t("share.hadithSource")}</footer>
      </blockquote>

      <div className="share-options">
        {canNativeShare() && (
          <button type="button" className="share-option primary" onClick={nativeShare}>
            <Icon name="share" size={20} /> {t("share.native")}
          </button>
        )}
        <a className="share-option" href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={20} /> {t("share.whatsapp")}
        </a>
        <a className="share-option" href={links.telegram} target="_blank" rel="noopener noreferrer">
          <Icon name="send" size={20} /> {t("share.telegram")}
        </a>
        <a className="share-option" href={links.email}>
          <Icon name="mail" size={20} /> {t("share.email")}
        </a>
        <button type="button" className={copied ? "share-option copied" : "share-option"} onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={20} /> {copied ? t("share.copied") : t("share.copy")}
        </button>
      </div>
      <p className="share-note">{t("share.nothingCollected")}</p>
    </div>
  );
}

export interface ShareButtonProps {
  url: string;
}

/**
 * The share button for the page header. Where the device has a share sheet it opens that
 * straight away; otherwise it opens a small dialog with the same options as the panel.
 */
export function ShareButton({ url }: ShareButtonProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  async function onClick() {
    if (canNativeShare()) {
      const message = buildShareMessage(language, url);
      try {
        await navigator.share({ title: message.title, text: message.text, url: message.url });
      } catch {
        // Cancelled.
      }
      return;
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const button = opener.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" className="share-button" onClick={onClick} aria-haspopup="dialog">
        <Icon name="share" size={20} />
        <span>{t("app.share")}</span>
      </button>
      {open &&
        // In a portal on the page body: the header is a stacking context of its own (it keeps still during page transitions), which would trap the dialog behind the page.
        createPortal(
        <div className="share-backdrop" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            className="share-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t("share.title")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="share-dialog-head">
              <h3>{t("share.title")}</h3>
              <button type="button" className="share-close" onClick={() => setOpen(false)} aria-label={t("share.close")}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <SharePanel url={url} />
          </div>
        </div>,
        document.body,
        )}
    </>
  );
}
