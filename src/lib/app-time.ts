/**
 * Calendar-day arithmetic in the troupe's local timezone.
 *
 * Show dates are stored as instants, but almost every scheduling rule is about
 * a *day*: a performance closes the day after it happens, casting is open for
 * "today or later". Doing that arithmetic in UTC would close an evening show
 * several hours early for a troupe in Central time, so days are resolved in the
 * configured zone rather than the server's.
 */

const DEFAULT_TIME_ZONE = "America/Chicago";

export function appTimeZone() {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIME_ZONE;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string) {
  const parts = zonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asIfUtc - Math.floor(instant.getTime() / 1_000) * 1_000;
}

/** The calendar day an instant falls on, as YYYY-MM-DD. */
export function dayInZone(instant: Date, timeZone = appTimeZone()) {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The instant a wall-clock time occurs on a calendar day in the given zone.
 * Resolved twice because the offset itself depends on the instant, which is what
 * shifts across a daylight-saving boundary.
 */
export function zonedInstant(
  day: string,
  time = "00:00",
  timeZone = appTimeZone(),
) {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, date, hour || 0, minute || 0);
  const firstPass = new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
  return new Date(naive - zoneOffsetMs(firstPass, timeZone));
}

/** The instant midnight begins on the given calendar day. */
export function startOfDayInZone(day: string, timeZone = appTimeZone()) {
  return zonedInstant(day, "00:00", timeZone);
}

/** The wall-clock time an instant shows in the zone, as HH:MM. */
export function timeInZone(instant: Date, timeZone = appTimeZone()) {
  const { hour, minute } = zonedParts(instant, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Reads a `datetime-local` input value as a wall-clock time in the troupe's
 * timezone, so an admin in another zone still schedules the show for 7pm local.
 * Returns null for anything the browser did not fill in properly.
 */
export function parseLocalDateTime(
  value: FormDataEntryValue | null | undefined,
  timeZone = appTimeZone(),
) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value.trim());
  if (!match) return null;
  const instant = zonedInstant(match[1], match[2], timeZone);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** Formats an instant for a `datetime-local` input in the troupe's timezone. */
export function toLocalDateTimeInput(
  instant: Date | null | undefined,
  timeZone = appTimeZone(),
) {
  if (!instant) return "";
  return `${dayInZone(instant, timeZone)}T${timeInZone(instant, timeZone)}`;
}

/** Today's calendar day in the troupe's timezone, as YYYY-MM-DD. */
export function appToday(now: Date = new Date(), timeZone = appTimeZone()) {
  return dayInZone(now, timeZone);
}

/** The instant today began in the troupe's timezone. */
export function startOfToday(now: Date = new Date(), timeZone = appTimeZone()) {
  return startOfDayInZone(appToday(now, timeZone), timeZone);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: appTimeZone(),
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: appTimeZone(),
  hour: "numeric",
  minute: "2-digit",
});

/** "Jun 14, 2026" in the troupe's timezone. */
export function formatDate(instant: Date) {
  return dateFormat.format(instant);
}

/** "Jun 14, 2026 · 7:30 PM" in the troupe's timezone. */
export function formatDateTime(instant: Date) {
  return `${dateFormat.format(instant)} · ${timeFormat.format(instant)}`;
}

/** "7:30 PM" in the troupe's timezone. */
export function formatTime(instant: Date) {
  return timeFormat.format(instant);
}

/** Adds whole days to a YYYY-MM-DD value without touching the clock. */
export function addDays(day: string, days: number) {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + days));
  return shifted.toISOString().slice(0, 10);
}
