import { THEME_IDS, type ThemeId } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface ThemePickerProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

/** A small preview of each theme — page, card, accent and text colours — so people choose by looking, not by name. Kept in step with the palettes in styles.css. */
const SWATCHES: Record<Exclude<ThemeId, "auto">, { bg: string; surface: string; accent: string; ink: string }> = {
  parchment: { bg: "#f1e9d8", surface: "#faf5ea", accent: "#1e5c55", ink: "#26221c" },
  emerald: { bg: "#e6f0e7", surface: "#f5faf4", accent: "#1f7a4a", ink: "#1c2a20" },
  ocean: { bg: "#e4edf6", surface: "#f4f9fd", accent: "#1d5f9e", ink: "#1b2733" },
  rose: { bg: "#f5e7ed", surface: "#fdf5f8", accent: "#a0325f", ink: "#2d1f26" },
  midnight: { bg: "#141b2e", surface: "#1b2438", accent: "#4fa89c", ink: "#ece4d2" },
  amoled: { bg: "#000000", surface: "#0e0e11", accent: "#4fc9b6", ink: "#ece8dd" },
};

/** Choose a colour theme. "Auto" follows the device's light/dark setting. */
export function ThemePicker({ theme, onThemeChange }: ThemePickerProps) {
  const { t } = useTranslation();

  return (
    <div className="theme-picker" role="radiogroup" aria-label={t("theme.label")}>
      {THEME_IDS.map((id) => {
        const selected = theme === id;
        const swatch = id === "auto" ? undefined : SWATCHES[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? "theme-option selected" : "theme-option"}
            onClick={() => onThemeChange(id)}
          >
            <span
              className="theme-swatch"
              aria-hidden="true"
              style={
                swatch
                  ? { background: swatch.bg, borderColor: swatch.ink }
                  : { background: `linear-gradient(135deg, ${SWATCHES.parchment.bg} 50%, ${SWATCHES.midnight.bg} 50%)` }
              }
            >
              {swatch && (
                <>
                  <span className="theme-swatch-card" style={{ background: swatch.surface }} />
                  <span className="theme-swatch-dot" style={{ background: swatch.accent }} />
                </>
              )}
            </span>
            <span className="theme-name">{t(`theme.${id}`)}</span>
            {selected && <Icon name="check" size={16} className="theme-check" />}
          </button>
        );
      })}
    </div>
  );
}
