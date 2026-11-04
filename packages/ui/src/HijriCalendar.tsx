import { useState } from "react";
import {
  MAX_HIJRI_ADJUSTMENT,
  clampHijriAdjustment,
  hijriMonthDays,
  shiftHijriMonth,
  upcomingEvents,
  type HijriDate,
  type HijriMonthDay,
} from "@manarah/core";
import { useTranslation } from "./i18n/index.js";
import { Icon } from "./icons/Icon.js";

/** Observances that are a day to celebrate rather than a recommended fast — drawn with extra emphasis. */
const EID_IDS = new Set(["eid-al-fitr", "eid-al-adha"]);
const UPCOMING_SHOWN = 4;

function useDateFormats() {
  const { language } = useTranslation();
  // "-u-nu-latn": Western digits in Arabic too, matching the rest of the app.
  const locale = language === "ar" ? "ar-u-nu-latn" : "en";
  return {
    weekdayShort: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
    full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    short: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
    monthYear: new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }),
  };
}

/** "21 Rabi' al-Thani 1448 AH" in the UI language. */
export function HijriToday({ hijri }: { hijri: HijriDate }) {
  const { t } = useTranslation();
  return (
    <span className="hijri-today">
      {hijri.day} {t(`hijri.month.${hijri.month}`)} {hijri.year} {t("hijri.ah")}
    </span>
  );
}

export interface HijriCalendarProps {
  /** The Hijri date right now — already includes the "day starts at Maghrib" move and the user's adjustment. */
  today: HijriDate;
  /** Today's civil date as UTC midnight (core's toCalendarDate). */
  todayCivil: Date;
  /** The user's adjustment in days, −2…+2. */
  adjustment: number;
  onAdjustmentChange: (days: number) => void;
}

/**
 * A Hijri month calendar: each cell is a Hijri day with its Gregorian date
 * beneath, observances marked, month navigation, the coming events, and a
 * ±2-day adjustment for matching the local moon-sighting announcement.
 * Dates are calculated (tabular rule), never sighted — the page says so.
 */
export function HijriCalendar({ today, todayCivil, adjustment, onAdjustmentChange }: HijriCalendarProps) {
  const { t, language } = useTranslation();
  const formats = useDateFormats();
  const [view, setView] = useState({ year: today.year, month: today.month });

  const shift = clampHijriAdjustment(adjustment);
  const days = hijriMonthDays(view.year, view.month, shift);
  const weekStart = language === "ar" ? 6 : 0; // Saturday-first in Arabic locales, Sunday-first otherwise
  const lead = (days[0].weekday - weekStart + 7) % 7;
  const cells: Array<HijriMonthDay | null> = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  // Short weekday names, starting from the locale's first day (2023-01-01 was a Sunday).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    formats.weekdayShort.format(new Date(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7))))
  );

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const gregorianRange =
    formats.monthYear.format(first) === formats.monthYear.format(last)
      ? formats.monthYear.format(first)
      : `${formats.monthYear.format(first)} – ${formats.monthYear.format(last)}`;
  const isCurrentMonth = view.year === today.year && view.month === today.month;

  // This month's observances, with the three White Days folded into one line.
  const monthEvents: Array<{ key: string; label: string; from: HijriMonthDay; to?: HijriMonthDay }> = [];
  for (const d of days) {
    for (const id of d.observances) {
      if (id === "white-days") continue;
      monthEvents.push({ key: `${id}-${d.day}`, label: t(`hijri.event.${id}`), from: d });
    }
  }
  const whiteDays = days.filter((d) => d.observances.includes("white-days"));
  if (whiteDays.length > 0) {
    monthEvents.push({
      key: "white-days",
      label: t("hijri.event.white-days"),
      from: whiteDays[0],
      to: whiteDays[whiteDays.length - 1],
    });
  }
  monthEvents.sort((a, b) => a.from.day - b.from.day);

  const upcoming = upcomingEvents(todayCivil, shift).slice(0, UPCOMING_SHOWN);

  function cellLabel(d: HijriMonthDay): string {
    const parts = [`${d.day} ${t(`hijri.month.${view.month}`)} ${view.year}`, formats.full.format(d.date)];
    for (const id of d.observances) parts.push(t(`hijri.event.${id}`));
    return parts.join(" · ");
  }

  function daysAwayLabel(daysAway: number): string {
    if (daysAway === 0) return t("hijri.todayLabel");
    if (daysAway === 1) return t("hijri.tomorrow");
    return t("hijri.inDays", { count: daysAway });
  }

  function formatAdjustment(days: number): string {
    return days === 0 ? "0" : days > 0 ? `+${days}` : `−${Math.abs(days)}`;
  }

  return (
    <section className="hijri-calendar" dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
      <div className="hijri-hero">
        <Icon name="calendar" size={24} />
        <div>
          <p className="hijri-hero-label">{t("hijri.todayLabel")}</p>
          <p className="hijri-hero-date">
            <HijriToday hijri={today} />
          </p>
          <p className="hijri-hero-gregorian">{formats.full.format(todayCivil)}</p>
        </div>
      </div>

      <div className="hijri-nav">
        <button type="button" aria-label={t("hijri.previousMonth")} onClick={() => setView((v) => shiftHijriMonth(v, -1))}>
          <Icon name="chevron-left" size={20} />
        </button>
        <div className="hijri-nav-title" aria-live="polite">
          <strong>
            {t(`hijri.month.${view.month}`)} {view.year} {t("hijri.ah")}
          </strong>
          <span>{gregorianRange}</span>
        </div>
        <button type="button" aria-label={t("hijri.nextMonth")} onClick={() => setView((v) => shiftHijriMonth(v, 1))}>
          <Icon name="chevron-right" size={20} />
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            className="hijri-nav-today"
            onClick={() => setView({ year: today.year, month: today.month })}
          >
            {t("hijri.goToToday")}
          </button>
        )}
      </div>

      <table className="hijri-grid" aria-label={`${t(`hijri.month.${view.month}`)} ${view.year} ${t("hijri.ah")}`}>
        <thead>
          <tr>
            {weekdays.map((w, i) => (
              <th key={i} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d, i) => {
                if (!d) return <td key={i} className="hijri-cell hijri-cell-empty" />;
                const isToday = isCurrentMonth && d.day === today.day;
                const classes = [
                  "hijri-cell",
                  isToday ? "hijri-cell-today" : "",
                  d.observances.some((id) => EID_IDS.has(id)) ? "hijri-cell-eid" : "",
                  d.observances.some((id) => id !== "white-days" && !EID_IDS.has(id)) ? "hijri-cell-event" : "",
                  d.observances.includes("white-days") ? "hijri-cell-white" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <td key={i} className={classes} aria-current={isToday ? "date" : undefined} aria-label={cellLabel(d)}>
                    <span className="hijri-day">{d.day}</span>
                    <span className="hijri-greg" dir="ltr">
                      {d.date.getUTCDate()}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="hijri-heading">{t("hijri.thisMonth")}</h3>
      {monthEvents.length === 0 ? (
        <p className="hijri-empty">{t("hijri.noEventsThisMonth")}</p>
      ) : (
        <ul className="hijri-events">
          {monthEvents.map((e) => (
            <li key={e.key}>
              <span className="hijri-event-name">{e.label}</span>
              <span className="hijri-event-when">
                {e.to
                  ? `${e.from.day}–${e.to.day} ${t(`hijri.month.${view.month}`)} · ${formats.short.format(e.from.date)} – ${formats.short.format(e.to.date)}`
                  : `${e.from.day} ${t(`hijri.month.${view.month}`)} · ${formats.short.format(e.from.date)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="hijri-heading">{t("hijri.upcoming")}</h3>
      <ul className="hijri-events">
        {upcoming.map((u) => (
          <li key={u.event.id}>
            <span className="hijri-event-name">{t(`hijri.event.${u.event.id}`)}</span>
            <span className="hijri-event-when">
              {formats.short.format(u.date)} · {daysAwayLabel(u.daysAway)}
            </span>
          </li>
        ))}
      </ul>

      <div className="hijri-adjust">
        <div>
          <strong>{t("hijri.adjust")}</strong>
          <p>{t("hijri.adjustHelp")}</p>
        </div>
        <div className="hijri-adjust-stepper" role="group" aria-label={t("hijri.adjust")}>
          <button
            type="button"
            aria-label={t("hijri.earlier")}
            disabled={shift <= -MAX_HIJRI_ADJUSTMENT}
            onClick={() => onAdjustmentChange(shift - 1)}
          >
            <Icon name="minus" size={16} />
          </button>
          <output aria-live="polite">{t("hijri.adjustValue", { value: formatAdjustment(shift) })}</output>
          <button
            type="button"
            aria-label={t("hijri.later")}
            disabled={shift >= MAX_HIJRI_ADJUSTMENT}
            onClick={() => onAdjustmentChange(shift + 1)}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>

      <p className="hijri-disclaimer">{t("hijri.disclaimer")}</p>
    </section>
  );
}
