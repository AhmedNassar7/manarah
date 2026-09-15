import { Link } from "react-router-dom";
import { useTranslation } from "@manarah/ui";

/** Shown on a page that needs `coordinates` (Prayer, Qibla) when none is set yet — points back to Home, the single place location is set, rather than duplicating a city picker on every page. */
export function LocationPrompt() {
  const { t } = useTranslation();

  return (
    <p className="alert">
      {t("app.locationNeeded")} <Link to="/">{t("app.goHome")}</Link>
    </p>
  );
}
