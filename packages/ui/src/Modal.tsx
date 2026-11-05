import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

/**
 * Gives focus back to the button that opened a dialog once it closes. (Some browsers, Safari
 * on a Mac among them, do not focus a button when it is clicked, so "whatever had focus" is not enough.)
 */
export function useReturnFocus(open: boolean, opener: RefObject<HTMLElement | null>) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) opener.current?.focus();
    wasOpen.current = open;
  }, [open, opener]);
}

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A small dialog: it rises over the page (from the bottom on a phone), closes with Escape, the
 * close button or a click outside, moves focus into itself when it opens and gives it back to
 * whatever had it when it closes. It is drawn in a portal on the page body, because the page
 * header is a stacking context of its own (it keeps still during page transitions) and would
 * otherwise trap the dialog behind the page.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialog.current?.querySelector<HTMLElement>("a, button:not(.share-close)")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="share-backdrop" onClick={onClose}>
      <div ref={dialog} className="share-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="share-dialog-head">
          <h3>{title}</h3>
          <button type="button" className="share-close" onClick={onClose} aria-label={t("share.close")}>
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
