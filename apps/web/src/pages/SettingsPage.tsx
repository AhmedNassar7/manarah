import { useRef, useState, type ReactNode } from "react";
import {
  MAX_HIJRI_ADJUSTMENT,
  clampHijriAdjustment,
  type PrayerTimesSettings,
  type UserSettings,
} from "@manarah/core";
import { CALCULATION_METHODS, RECITERS } from "@manarah/data";
import { exportStore, importStore, type Store } from "@manarah/storage";
import { useInstall } from "../install.js";
import { appShareUrl } from "../share-url.js";
import {
  FeedbackForm,
  Icon,
  InstallGuide,
  LanguageSwitcher,
  LocationSummary,
  PrayerSettingsEditor,
  ReadingSettings,
  SharePanel,
  ThemePicker,
  useTranslation,
  type LocationSummaryProps,
} from "@manarah/ui";

/** Where "open as an issue" sends feedback — the project's own repository. */
const REPOSITORY_URL = "https://github.com/AhmedNassar7/manarah";
const APP_VERSION = "0.0.1";

export interface SettingsPageProps {
  settings: UserSettings;
  /** Merges a change into the saved settings. */
  onSettingsChange: (patch: Partial<UserSettings>) => void;
  /** Prayer settings recompute today's times, so they have their own handler. */
  onPrayerSettingsChange: (settings: PrayerTimesSettings) => void;
  locationSummary: LocationSummaryProps;
  store: Store;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="settings-section card">
      <h3>{title}</h3>
      {hint && <p className="settings-hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Every setting in one place: appearance, prayer times, recitation, calendar, notifications, backup, and rating/feedback. */
export function SettingsPage({ settings, onSettingsChange, onPrayerSettingsChange, locationSummary, store }: SettingsPageProps) {
  const install = useInstall();
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">(permission);

  async function download() {
    const json = await exportStore(store);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `manarah-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      await importStore(store, await file.text());
      setBackupMessage(t("settings.restored"));
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setBackupMessage(t("settings.restoreFailed"));
    }
  }

  async function enableNotifications() {
    setNotificationState(await Notification.requestPermission());
  }

  const shift = clampHijriAdjustment(settings.hijriAdjustment);

  return (
    <>
      <h2 className="section-title">{t("app.sectionSettings")}</h2>
      <div className="settings-grid">
        <Section title={t("settings.appearance")}>
          <div className="settings-row">
            <span>{t("settings.language")}</span>
            <LanguageSwitcher />
          </div>
          <p className="settings-subtitle">{t("theme.label")}</p>
          <ThemePicker theme={settings.theme} onThemeChange={(theme) => onSettingsChange({ theme })} />
        </Section>

        <Section title={t("settings.prayer")}>
          <LocationSummary {...locationSummary} />
          <PrayerSettingsEditor methods={CALCULATION_METHODS} settings={settings.prayerTimesSettings} onChange={onPrayerSettingsChange} />
        </Section>

        <Section title={t("settings.quran")}>
          <ReadingSettings
            defaultOpen
            fontStep={settings.readerFontStep}
            onFontStepChange={(readerFontStep) => onSettingsChange({ readerFontStep })}
            showTranslation={settings.showTranslation}
            onShowTranslationChange={(showTranslation) => onSettingsChange({ showTranslation })}
            reciters={RECITERS}
            reciterId={settings.reciterId}
            onReciterChange={(reciterId) => onSettingsChange({ reciterId })}
            reciterStyle={settings.reciterStyle}
            onReciterStyleChange={(reciterStyle) => onSettingsChange({ reciterStyle })}
          />
        </Section>

        <Section title={t("settings.calendar")}>
          <div className="settings-row">
            <div>
              <strong>{t("hijri.adjust")}</strong>
              <p className="settings-hint">{t("hijri.adjustHelp")}</p>
            </div>
            <div className="settings-stepper" role="group" aria-label={t("hijri.adjust")}>
              <button type="button" aria-label={t("hijri.earlier")} disabled={shift <= -MAX_HIJRI_ADJUSTMENT} onClick={() => onSettingsChange({ hijriAdjustment: shift - 1 })}>
                <Icon name="minus" size={16} />
              </button>
              <output>{t("hijri.adjustValue", { value: shift > 0 ? `+${shift}` : shift < 0 ? `−${Math.abs(shift)}` : "0" })}</output>
              <button type="button" aria-label={t("hijri.later")} disabled={shift >= MAX_HIJRI_ADJUSTMENT} onClick={() => onSettingsChange({ hijriAdjustment: shift + 1 })}>
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
          <label className="settings-row">
            <div>
              <strong>{t("hijri.reminders")}</strong>
              <p className="settings-hint">{t("hijri.remindersHelp")}</p>
            </div>
            <input type="checkbox" checked={settings.observanceReminders} onChange={(event) => onSettingsChange({ observanceReminders: event.target.checked })} />
          </label>
        </Section>

        <Section title={t("settings.notifications")}>
          {notificationState === "granted" && <p className="settings-ok">{t("settings.notificationsOn")}</p>}
          {notificationState === "denied" && <p className="settings-hint">{t("settings.notificationsBlocked")}</p>}
          {notificationState === "unsupported" && <p className="settings-hint">{t("settings.notificationsUnsupported")}</p>}
          {notificationState === "default" && (
            <button type="button" className="settings-button" onClick={() => void enableNotifications()}>
              <Icon name="bell" size={16} /> {t("notifications.enableButton")}
            </button>
          )}
        </Section>

        <Section title={t("settings.backup")} hint={t("settings.backupHelp")}>
          <div className="settings-actions">
            <button type="button" className="settings-button" onClick={() => void download()}>
              <Icon name="download" size={16} /> {t("settings.download")}
            </button>
            <button type="button" className="settings-button" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={16} /> {t("settings.restore")}
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void restore(event.target.files?.[0])} />
          </div>
          {backupMessage && (
            <p className="settings-ok" role="status">
              {backupMessage}
            </p>
          )}
        </Section>

        <Section title={t("install.title")}>
          <InstallGuide platform={install.platform} canPrompt={install.canPrompt} installed={install.installed} onInstall={() => void install.prompt()} />
        </Section>

        <Section title={t("share.title")}>
          <SharePanel url={appShareUrl()} />
        </Section>

        <Section title={t("settings.about")}>
          <FeedbackForm
            rating={settings.appRating}
            onRatingChange={(appRating) => onSettingsChange({ appRating })}
            appVersion={APP_VERSION}
            repositoryUrl={REPOSITORY_URL}
          />
          <p className="settings-hint">{t("settings.version", { v: APP_VERSION })}</p>
        </Section>
      </div>
    </>
  );
}
