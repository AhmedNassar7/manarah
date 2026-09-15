import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Language } from "@manarah/core";
import { translate, type TranslationVars } from "./translations.js";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: TranslationVars) => string;
  /** "rtl" for Arabic, "ltr" otherwise — for components that need it directly rather than via the DOM. */
  dir: "ltr" | "rtl";
}

// English, no-op setter — so every component using useTranslation() works
// standalone (including in tests) without requiring a wrapping
// LanguageProvider. Only the app shells need the real Provider, to make
// switching + persistence + <html dir/lang> actually work.
const DEFAULT_CONTEXT: LanguageContextValue = {
  language: "en",
  setLanguage: () => {},
  t: (key, vars) => translate("en", key, vars),
  dir: "ltr",
};

const LanguageContext = createContext<LanguageContextValue>(DEFAULT_CONTEXT);

export interface LanguageProviderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  children: ReactNode;
}

/**
 * Makes the current language available to every shared UI component via
 * useTranslation(), and keeps `<html lang/dir>` in sync so the browser's
 * own bidi/RTL layout and form-control mirroring kick in — not just the
 * translated text. Controlled: the app shell owns and persists `language`,
 * this just distributes it and reports change requests back up.
 */
export function LanguageProvider({ language, onLanguageChange, children }: LanguageProviderProps) {
  const dir = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: onLanguageChange,
      t: (key, vars) => translate(language, key, vars),
      dir,
    }),
    [language, onLanguageChange, dir]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** The active language, a setter, and `t()` for translating UI chrome strings. Works without a Provider (defaults to English). */
export function useTranslation(): LanguageContextValue {
  return useContext(LanguageContext);
}
