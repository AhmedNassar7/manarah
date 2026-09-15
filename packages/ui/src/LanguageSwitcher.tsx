import { useTranslation } from "./i18n/index.js";

/**
 * Toggles the UI language between English and Arabic. Each option is
 * always labeled in its own language (not translated into whichever is
 * currently active) — the standard convention, so a user can find their
 * language regardless of what's currently displayed.
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="language-switcher" role="group" aria-label="Language / اللغة">
      <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
        English
      </button>
      <button type="button" aria-pressed={language === "ar"} onClick={() => setLanguage("ar")}>
        العربية
      </button>
    </div>
  );
}
