import { useState } from "react";
import { Icon, useTranslation } from "@manarah/ui";

/** One-time opt-in banner for prayer/azkar notifications — shown only while permission hasn't been decided yet (not after a grant or a denial, since the browser owns that choice from then on). */
export function NotificationPrompt() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  if (permission !== "default") return null;

  async function handleEnable() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="notice">
      <p>{t("notifications.enablePrompt")}</p>
      <button type="button" onClick={() => void handleEnable()}>
        <Icon name="bell" size={16} /> {t("notifications.enableButton")}
      </button>
    </div>
  );
}
