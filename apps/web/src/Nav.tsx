import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon, useTranslation } from "@manarah/ui";
import { useTransitionLink } from "./view-transition.js";

const PRIMARY_ITEMS = [
  { to: "/", icon: "home", labelKey: "app.sectionHome", end: true, hue: "home" },
  { to: "/prayer", icon: "mosque", labelKey: "app.sectionPrayer", end: false, hue: "prayer" },
  { to: "/quran", icon: "quran", labelKey: "app.sectionQuran", end: false, hue: "quran" },
  { to: "/azkar", icon: "azkar", labelKey: "app.sectionAzkar", end: false, hue: "azkar" },
] as const;

/** On a phone these sit behind a "More" button; on larger screens every item is shown in the nav. */
const SECONDARY_ITEMS = [
  { to: "/tasbih", icon: "tasbih", labelKey: "app.sectionTasbih", end: false, hue: "tasbih" },
  { to: "/qibla", icon: "qibla", labelKey: "app.sectionQibla", end: false, hue: "qibla" },
  { to: "/hadith", icon: "hadith", labelKey: "app.sectionHadith", end: false, hue: "hadith" },
  { to: "/calendar", icon: "calendar", labelKey: "app.sectionCalendar", end: false, hue: "calendar" },
  { to: "/zakat", icon: "zakat", labelKey: "app.sectionZakat", end: false, hue: "zakat" },
  { to: "/challenge", icon: "trophy", labelKey: "app.sectionChallenge", end: false, hue: "challenge" },
  { to: "/settings", icon: "gear", labelKey: "app.sectionSettings", end: false, hue: "home" },
] as const;

type NavItem = (typeof PRIMARY_ITEMS)[number] | (typeof SECONDARY_ITEMS)[number];

/** One section link; moving to it crossfades the page. */
function NavItemLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const onClick = useTransitionLink(item.to);
  return (
    <NavLink to={item.to} end={item.end} data-hue={item.hue} className={({ isActive }) => (isActive ? "active" : undefined)} onClick={onClick}>
      <Icon name={item.icon} size={20} />
      <span>{t(item.labelKey)}</span>
    </NavLink>
  );
}

/**
 * Persistent section navigation — each feature gets its own page/route instead of one long scroll.
 * Phones get a bottom bar (four main sections plus "More", within thumb reach); tablets and desktops
 * keep the full strip / sidebar. It is the same set of links either way, so nothing is hidden from
 * the keyboard or a screen reader on the larger layouts.
 */
export function Nav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // A new page closes the sheet.
  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (moreRef.current?.contains(target)) return;
      if ((target as Element).closest?.(".app-nav-more-button")) return;
      setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [moreOpen]);

  const secondaryActive = SECONDARY_ITEMS.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));


  return (
    <nav className="app-nav" aria-label={t("app.sectionHome")} data-more-open={moreOpen || undefined}>
      {PRIMARY_ITEMS.map((item) => (
        <NavItemLink key={item.to} item={item} />
      ))}
      <div className="app-nav-more" id="app-nav-more" ref={moreRef}>
        {SECONDARY_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </div>
      <button
        type="button"
        className={secondaryActive ? "app-nav-more-button active" : "app-nav-more-button"}
        aria-expanded={moreOpen}
        aria-controls="app-nav-more"
        onClick={() => setMoreOpen((open) => !open)}
      >
        <Icon name="more" size={20} />
        <span>{t("app.more")}</span>
      </button>
    </nav>
  );
}
