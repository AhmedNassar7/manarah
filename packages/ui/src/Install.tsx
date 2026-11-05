import { useCallback, useRef, useState } from "react";
import { installPlatformOrder, type InstallPlatform } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";
import { Modal, useReturnFocus } from "./Modal.js";

export interface InstallGuideProps {
  /** The kind of device this is, so its steps come first. */
  platform: InstallPlatform;
  /** The browser can start the install by itself: the button does it. */
  canPrompt: boolean;
  /** Already installed on this device. */
  installed: boolean;
  /** Starts the browser's own install. */
  onInstall: () => void;
}

/**
 * How to get Manarah onto a phone or computer as an app: its own icon, full screen, working
 * without the browser's bars. Where the browser lets the page start the install, a button does
 * it; everywhere else it is a few steps in the browser's own menu, listed for this device first
 * and then the others. It is a web app, so there is nothing to download from a store.
 */
export function InstallGuide({ platform, canPrompt, installed, onInstall }: InstallGuideProps) {
  const { t, language } = useTranslation();

  if (installed) {
    return (
      <p className="install-done" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
        <Icon name="check" size={16} /> {t("install.installed")}
      </p>
    );
  }

  const [first, ...others] = installPlatformOrder(platform);
  const steps = (p: InstallPlatform) => (
    <section className="install-platform" key={p}>
      <h4>{t(`install.${p}.title`)}</h4>
      <ol>
        {[1, 2, 3].map((n) => (
          <li key={n}>{t(`install.${p}.step${n}`)}</li>
        ))}
      </ol>
      {p === "desktop" && <p className="install-note">{t("install.desktop.note")}</p>}
    </section>
  );

  return (
    <div className="install-guide" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <p className="install-intro">{t("install.intro")}</p>
      {canPrompt && (
        <button type="button" className="install-now" onClick={onInstall}>
          <Icon name="download" size={20} /> {t("install.now")}
        </button>
      )}
      {steps(first)}
      <details className="install-others">
        <summary>{t("install.other")}</summary>
        {others.map(steps)}
      </details>
    </div>
  );
}

export interface InstallButtonProps extends InstallGuideProps {}

/**
 * The header's install button. Shown only where there is something to do: where the browser
 * can start the install it does that straight away; on a phone that cannot (an iPhone, an
 * Android browser that did not offer it) it opens the steps. A computer browser that cannot
 * install, and an app already installed, get no button — the Settings page still has the guide.
 */
export function InstallButton({ platform, canPrompt, installed, onInstall }: InstallButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const opener = useRef<HTMLButtonElement>(null);
  useReturnFocus(open, opener);

  if (installed) return null;
  if (!canPrompt && platform === "desktop") return null;

  return (
    <>
      <button ref={opener} type="button" className="install-button" onClick={() => (canPrompt ? onInstall() : setOpen(true))} aria-haspopup={canPrompt ? undefined : "dialog"}>
        <Icon name="download" size={20} />
        <span>{t("install.button")}</span>
      </button>
      {open && (
        <Modal title={t("install.title")} onClose={close}>
          <InstallGuide platform={platform} canPrompt={canPrompt} installed={installed} onInstall={onInstall} />
        </Modal>
      )}
    </>
  );
}
