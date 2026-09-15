import { NavLink } from "react-router-dom";
import { useTranslation } from "@manarah/ui";

const NAV_ITEMS = [
  { to: "/", icon: "🏠", labelKey: "app.sectionHome", end: true },
  { to: "/prayer", icon: "🕌", labelKey: "app.sectionPrayer", end: false },
  { to: "/qibla", icon: "🧭", labelKey: "app.sectionQibla", end: false },
  { to: "/quran", icon: "📖", labelKey: "app.sectionQuran", end: false },
  { to: "/azkar", icon: "📿", labelKey: "app.sectionAzkar", end: false },
] as const;

/** Persistent section navigation — each feature gets its own page/route instead of one long scroll. */
export function Nav() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" aria-label={t("app.sectionHome")}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
          <span aria-hidden="true">{item.icon}</span>
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
