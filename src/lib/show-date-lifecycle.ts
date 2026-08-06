import type { Prisma, ShowDateStatus } from "@prisma/client";
import { appToday, dayInZone, startOfToday } from "@/lib/app-time";
import { db } from "@/lib/db";

/**
 * Show-date status lifecycle and visibility.
 *
 * OPEN and FULLY_CAST close automatically once the day after the performance
 * begins. CANCELED stays visible up to and including the performance day and is
 * history afterwards. CLOSED is always history: it belongs on the calendar when
 * browsing past months, never in forward-looking lists.
 */

/** Statuses a performer may opt in against. */
export const CASTING_OPEN_STATUSES: ShowDateStatus[] = ["OPEN", "FULLY_CAST"];

type VisibilityInput = { date: Date; status: ShowDateStatus };

/** Does this date still matter when looking ahead? */
export function isForwardVisible(
  showDate: VisibilityInput,
  today: string = appToday(),
) {
  if (showDate.status === "CLOSED") return false;
  return dayInZone(showDate.date) >= today;
}

/** Is casting open to performers right now? */
export function isCastingOpen(
  showDate: VisibilityInput,
  today: string = appToday(),
) {
  return (
    CASTING_OPEN_STATUSES.includes(showDate.status) &&
    isForwardVisible(showDate, today)
  );
}

/**
 * Closes performances whose day has passed. A single statement replaces the
 * row-by-row scan the Flask version ran on every casting page load: any show
 * starting before midnight today necessarily happened on an earlier day.
 */
export async function applyAutoClose(now: Date = new Date()) {
  const { count } = await db.showDate.updateMany({
    where: {
      status: { in: CASTING_OPEN_STATUSES },
      date: { lt: startOfToday(now) },
    },
    data: { status: "CLOSED" },
  });
  return count;
}

/** Dates a performer can opt in to, soonest first. */
export function castingOpenWhere(now: Date = new Date()): Prisma.ShowDateWhereInput {
  return {
    status: { in: CASTING_OPEN_STATUSES },
    date: { gte: startOfToday(now) },
  };
}

/** Upcoming dates for ops strips, excluding anything that is history-only. */
export function upcomingWhere(now: Date = new Date()): Prisma.ShowDateWhereInput {
  return {
    status: { not: "CLOSED" },
    date: { gte: startOfToday(now) },
  };
}

/**
 * Recomputes FULLY_CAST from confirmed seats. Terminal and draft statuses are
 * left alone so an auto-promotion can never resurrect a canceled performance.
 */
export function nextCastStatus(
  status: ShowDateStatus,
  roleCount: number,
  confirmedCount: number,
): ShowDateStatus {
  if (status === "DRAFT" || status === "CLOSED" || status === "CANCELED") {
    return status;
  }
  if (roleCount > 0 && confirmedCount >= roleCount) return "FULLY_CAST";
  return status === "FULLY_CAST" ? "OPEN" : status;
}

/** Short human summary of how far casting has progressed. */
export function castingStatusLabel(
  roleCount: number,
  confirmedCount: number,
  offeredCount: number,
) {
  if (roleCount === 0) return "No roles defined";
  if (confirmedCount === 0 && offeredCount === 0) return "Not cast";
  if (confirmedCount >= roleCount) return "Fully cast";
  const base = `${confirmedCount}/${roleCount} confirmed`;
  return offeredCount ? `${base}, ${offeredCount} offered` : base;
}

export const SHOW_DATE_STATUS_LABELS: Record<ShowDateStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  FULLY_CAST: "Fully Cast",
  CLOSED: "Closed",
  CANCELED: "Canceled",
};

/** Calendar colours, matching the palette the Flask calendar used. */
export const SHOW_DATE_STATUS_COLORS: Record<ShowDateStatus, string> = {
  DRAFT: "#9E9E9E",
  OPEN: "#81C784",
  FULLY_CAST: "#B39DDB",
  CLOSED: "#E0E0E0",
  CANCELED: "#EF9A9A",
};

export const REHEARSAL_COLOR = "#90CAF9";
