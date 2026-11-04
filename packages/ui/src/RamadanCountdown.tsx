import { ramadanStatus } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface RamadanCountdownProps {
  /** Today's civil date as UTC midnight (core's toCalendarDate). */
  todayCivil: Date;
  /** The user's Hijri adjustment in days. */
  adjustment?: number;
}

/**
 * "N days until Ramadan" — which turns into "Day N of Ramadan" with a
 * progress bar once it begins, and a greeting on Eid. The date follows the
 * calculated calendar (plus the user's adjustment), so the card says it's
 * expected, not announced.
 */
export function RamadanCountdown({ todayCivil, adjustment = 0 }: RamadanCountdownProps) {
  const { t, language } = useTranslation();
  const status = ramadanStatus(todayCivil, adjustment);
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const dateFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <section className="ramadan-card" data-phase={status.phase} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="ramadan-card-sky" aria-hidden="true">
        <span className="ramadan-star ramadan-star-1" />
        <span className="ramadan-star ramadan-star-2" />
        <span className="ramadan-star ramadan-star-3" />
      </div>
      <span className="ramadan-card-moon">
        <Icon name="moon-star" size={24} />
      </span>

      {status.phase === "before" && (
        <div className="ramadan-card-body">
          <p className="ramadan-card-label">{t("ramadan.label")}</p>
          <p className="ramadan-card-number" aria-label={t("ramadan.daysAway", { count: status.daysAway })}>
            <strong>{status.daysAway}</strong>
            <span>{status.daysAway === 1 ? t("ramadan.dayToGo") : t("ramadan.daysToGo")}</span>
          </p>
          <p className="ramadan-card-note">
            {status.daysAway === 1
              ? t("ramadan.startsTomorrow")
              : t("ramadan.expected", { date: dateFormat.format(status.startsOn) })}
          </p>
        </div>
      )}

      {status.phase === "during" && (
        <div className="ramadan-card-body">
          <p className="ramadan-card-label">{t("ramadan.mubarak")}</p>
          <p className="ramadan-card-number">
            <strong>{t("ramadan.dayOf", { day: status.day, length: status.length })}</strong>
          </p>
          <div
            className="ramadan-card-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={status.length}
            aria-valuenow={status.day}
            aria-label={t("ramadan.dayOf", { day: status.day, length: status.length })}
          >
            <span style={{ width: `${(status.day / status.length) * 100}%` }} />
          </div>
          <p className="ramadan-card-note">
            {status.daysLeft === 0 ? t("ramadan.lastDay") : t("ramadan.daysLeft", { count: status.daysLeft })}
          </p>
        </div>
      )}

      {status.phase === "eid" && (
        <div className="ramadan-card-body">
          <p className="ramadan-card-label">{t("ramadan.eidLabel")}</p>
          <p className="ramadan-card-number">
            <strong>{t("ramadan.eidMubarak")}</strong>
          </p>
          <p className="ramadan-card-note">{t("ramadan.eidWish")}</p>
        </div>
      )}
      <p className="ramadan-card-caveat">{t("ramadan.caveat")}</p>
    </section>
  );
}
