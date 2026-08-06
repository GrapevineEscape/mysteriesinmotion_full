import type { Purchase, PurchaseStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const PURCHASE_START_YEARS = 1;
export const PLAY_WINDOW_HOURS = 48;

const ACTIVE_STATUSES: PurchaseStatus[] = ["PAID", "COMPLIMENTARY"];

type EntitlementDates = Pick<
  Purchase,
  "playWindowEndsAt" | "playWindowStartedAt" | "startByAt" | "status"
>;

export function entitlementStartDeadline(from = new Date()) {
  const deadline = new Date(from);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + PURCHASE_START_YEARS);
  return deadline;
}

export function entitlementWindowEnd(from = new Date()) {
  return new Date(from.getTime() + PLAY_WINDOW_HOURS * 60 * 60_000);
}

export function isActiveEntitlementStatus(status: PurchaseStatus) {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * A new game can begin before the one-year start deadline, or while an already
 * activated 48-hour replay window remains open.
 */
export function canStartNewGame(
  entitlement: EntitlementDates,
  now = new Date(),
) {
  if (!isActiveEntitlementStatus(entitlement.status)) return false;
  if (entitlement.playWindowStartedAt) {
    return Boolean(
      entitlement.playWindowEndsAt &&
        entitlement.playWindowEndsAt.getTime() > now.getTime(),
    );
  }
  return Boolean(
    entitlement.startByAt &&
      entitlement.startByAt.getTime() > now.getTime(),
  );
}

export async function findStartableEntitlement(
  userId: string,
  showId: string,
  now = new Date(),
) {
  return db.purchase.findFirst({
    where: {
      userId,
      showId,
      status: { in: ACTIVE_STATUSES },
      OR: [
        {
          playWindowStartedAt: null,
          startByAt: { gt: now },
        },
        {
          playWindowStartedAt: { not: null },
          playWindowEndsAt: { gt: now },
        },
      ],
    },
    orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
  });
}

export function gameCanContinue(
  attempt: {
    completedAt: Date | null;
    investigationStartedAt: Date | null;
    purchase: EntitlementDates | null;
  },
) {
  return Boolean(
    !attempt.completedAt &&
      attempt.investigationStartedAt &&
      attempt.purchase &&
      isActiveEntitlementStatus(attempt.purchase.status),
  );
}
