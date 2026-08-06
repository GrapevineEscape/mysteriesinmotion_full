export const REPORTING_TIME_ZONE = "America/Chicago";

export const adminDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: REPORTING_TIME_ZONE,
});

export const adminDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: REPORTING_TIME_ZONE,
});

export function formatMoney(amountCents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function latestDate(values: Array<Date | null | undefined>) {
  const timestamps = values
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}

export function attemptHasStarted(attempt: {
  investigationStartedAt: Date | null;
  furthestIntroSeconds: number;
  furthestActOneSeconds: number;
  furthestActTwoSeconds: number;
  accusationSubmittedAt: Date | null;
}) {
  return Boolean(
    attempt.investigationStartedAt ||
      attempt.furthestIntroSeconds > 0 ||
      attempt.furthestActOneSeconds > 0 ||
      attempt.furthestActTwoSeconds > 0 ||
      attempt.accusationSubmittedAt,
  );
}

export function purchaseAccessLabel(
  purchase: {
    status: string;
    startByAt: Date | null;
    playWindowStartedAt: Date | null;
    playWindowEndsAt: Date | null;
  },
  now = new Date(),
) {
  if (!["PAID", "COMPLIMENTARY"].includes(purchase.status)) {
    return purchase.status === "PENDING" ? "No access" : purchase.status;
  }
  if (purchase.playWindowEndsAt) {
    return purchase.playWindowEndsAt > now ? "48-hour window active" : "Expired";
  }
  if (purchase.startByAt) {
    return purchase.startByAt > now ? "Unused / available" : "Expired unused";
  }
  return purchase.playWindowStartedAt ? "Started" : "Available";
}

export type ReportPeriod = "7" | "30" | "90" | "365" | "all";

export function parseReportPeriod(value: string | undefined): ReportPeriod {
  return value === "7" ||
    value === "90" ||
    value === "365" ||
    value === "all"
    ? value
    : "30";
}

export function reportPeriodStart(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;
  return new Date(now.getTime() - Number(period) * 86_400_000);
}

export function withinReportPeriod(
  date: Date | null | undefined,
  start: Date | null,
) {
  return Boolean(date && (!start || date >= start));
}

