import { NavLink } from "react-router-dom";
import { Icon, useTranslation } from "@manarah/ui";

const NAV_ITEMS = [
  { to: "/", icon: "home", labelKey: "app.sectionHome", end: true, hue: "home" },
  { to: "/prayer", icon: "mosque", labelKey: "app.sectionPrayer", end: false, hue: "prayer" },
  { to: "/qibla", icon: "qibla", labelKey: "app.sectionQibla", end: false, hue: "qibla" },
  { to: "/quran", icon: "quran", labelKey: "app.sectionQuran", end: false, hue: "quran" },
  { to: "/hadith", icon: "hadith", labelKey: "app.sectionHadith", end: false, hue: "hadith" },
  { to: "/calendar", icon: "calendar", labelKey: "app.sectionCalendar", end: false, hue: "calendar" },
  { to: "/zakat", icon: "zakat", labelKey: "app.sectionZakat", end: false, hue: "zakat" },
  { to: "/azkar", icon: "tasbih", labelKey: "app.sectionAzkar", end: false, hue: "azkar" },
  { to: "/challenge", icon: "trophy", labelKey: "app.sectionChallenge", end: false, hue: "challenge" },
  { to: "/settings", icon: "gear", labelKey: "app.sectionSettings", end: false, hue: "home" },
] as const;

/** Persistent section navigation — each feature gets its own page/route instead of one long scroll. */
export function Nav() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" aria-label={t("app.sectionHome")}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} data-hue={item.hue} className={({ isActive }) => (isActive ? "active" : undefined)}>
          <Icon name={item.icon} size={20} />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
