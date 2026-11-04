import { NavLink } from "react-router-dom";
import { Icon, useTranslation } from "@manarah/ui";

const NAV_ITEMS = [
  { to: "/", icon: "home", labelKey: "app.sectionHome", end: true },
  { to: "/prayer", icon: "mosque", labelKey: "app.sectionPrayer", end: false },
  { to: "/qibla", icon: "qibla", labelKey: "app.sectionQibla", end: false },
  { to: "/quran", icon: "quran", labelKey: "app.sectionQuran", end: false },
  { to: "/hadith", icon: "hadith", labelKey: "app.sectionHadith", end: false },
  { to: "/calendar", icon: "calendar", labelKey: "app.sectionCalendar", end: false },
  { to: "/azkar", icon: "tasbih", labelKey: "app.sectionAzkar", end: false },
] as const;

/** Persistent section navigation — each feature gets its own page/route instead of one long scroll. */
export function Nav() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" aria-label={t("app.sectionHome")}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
          <Icon name={item.icon} size={20} />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
