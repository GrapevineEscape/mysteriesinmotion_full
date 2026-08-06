import { addDays, dayInZone, zonedInstant } from "@/lib/app-time";

/** Evening slot the Flask wizard suggested for every generated rehearsal. */
const DEFAULT_REHEARSAL_TIME = "19:00";

export const MAX_SUGGESTED_REHEARSALS = 8;

/**
 * Spreads rehearsals evenly across the days leading up to a performance, then
 * puts each one in the evening. With the default fortnight and four rehearsals
 * this lands 14, 11, 8, and 5 days out, matching the Flask wizard's suggestions.
 *
 * The interval divides by one more than the count so the last rehearsal never
 * falls on the performance itself.
 */
export function suggestRehearsalDates(
  showDate: Date,
  timeframeDays: number,
  count: number,
) {
  const wanted = Math.max(0, Math.min(count, MAX_SUGGESTED_REHEARSALS));
  if (wanted === 0 || timeframeDays <= 0) return [];

  const showDay = dayInZone(showDate);
  const interval = timeframeDays / (wanted + 1);

  const days = new Set<string>();
  for (let index = 0; index < wanted; index += 1) {
    const daysBefore = Math.trunc(timeframeDays - index * interval);
    days.add(addDays(showDay, -daysBefore));
  }

  return [...days]
    .sort()
    .map((day) => zonedInstant(day, DEFAULT_REHEARSAL_TIME));
}

/** Default tech rehearsal slot: the evening before the performance. */
export function defaultTechDate(showDate: Date) {
  return zonedInstant(addDays(dayInZone(showDate), -1), DEFAULT_REHEARSAL_TIME);
}
