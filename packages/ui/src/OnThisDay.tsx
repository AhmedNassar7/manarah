import { eventsOnDate, hijriDateOfCivilDay, nextHistoricalEvents, type HistoricalEvent } from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

export interface OnThisDayProps {
  events: HistoricalEvent[];
  /** Today's civil date as UTC midnight (core's toCalendarDate). */
  todayCivil: Date;
  /** The user's Hijri adjustment in days. */
  adjustment?: number;
  /** How many upcoming events to show when nothing is recorded for today. */
  upcomingCount?: number;
}

/**
 * "On this day in Islamic history": the events recorded for today's Hijri
 * date, or — on the many days with none — the next few, so the card always has
 * something to say. Each event says how sure its date is; the traditional ones
 * are labelled as such rather than presented as settled.
 */
export function OnThisDay({ events, todayCivil, adjustment = 0, upcomingCount = 2 }: OnThisDayProps) {
  const { t, language } = useTranslation();
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  const dateFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  const today = eventsOnDate(events, todayCivil, adjustment);
  const upcoming = today.length === 0 ? nextHistoricalEvents(events, todayCivil, adjustment, upcomingCount) : [];

  function when(date: Date, daysAway: number): string {
    const hijri = hijriDateOfCivilDay(date, adjustment);
    const away = daysAway === 0 ? t("hijri.todayLabel") : daysAway === 1 ? t("hijri.tomorrow") : t("hijri.inDays", { count: daysAway });
    return `${hijri.day} ${t(`hijri.month.${hijri.month}`)} · ${dateFormat.format(date)} · ${away}`;
  }

  function confidence(event: HistoricalEvent) {
    return (
      <span className={`history-chip history-chip-${event.confidence}`}>
        {t(event.confidence === "established" ? "history.established" : "history.traditional")}
      </span>
    );
  }

  return (
    <section className="on-this-day" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <h3>
        <Icon name="landmark" size={20} /> {t("history.title")}
      </h3>

      {today.length > 0 ? (
        <ul>
          {today.map((e) => (
            <li key={e.id} className="history-today">
              <p className="history-event-title">{e.title[language]}</p>
              <p className="history-event-note">{e.note[language]}</p>
              {confidence(e)}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="history-none">{t("history.none")}</p>
          <h4>{t("history.comingUp")}</h4>
          <ul>
            {upcoming.map(({ event, date, daysAway }) => (
              <li key={event.id}>
                <p className="history-when">{when(date, daysAway)}</p>
                <p className="history-event-title">{event.title[language]}</p>
                <p className="history-event-note">{event.note[language]}</p>
                {confidence(event)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
