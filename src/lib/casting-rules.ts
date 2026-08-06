/**
 * The rules that decide whether a casting move is allowed.
 *
 * Kept free of Prisma so each rule can be exercised directly. The database
 * layer in casting.ts loads the state, asks these functions, and only then
 * writes.
 */

export type CastingDecision =
  | { ok: true }
  | { ok: false; message: string };

const allowed: CastingDecision = { ok: true };

function refuse(message: string): CastingDecision {
  return { ok: false, message };
}

export type OfferState = {
  /** The role being offered, or null when it does not belong to this show. */
  role: { name: string } | null;
  /** An existing seat for the role, whoever holds it. */
  seatForRole: { status: "OFFERED" | "CONFIRMED" } | null;
  /** Whether the performer opted in for this role on this date. */
  hasInterest: boolean;
  /** Any other offered or confirmed seat this performer holds on this date. */
  performerActiveSeat: { roleName: string } | null;
};

/**
 * A performer may hold at most one seat per performance, and only after opting
 * in: an offer is a response to interest, not a way to conscript someone.
 */
export function checkOffer(state: OfferState): CastingDecision {
  if (!state.role) return refuse("That role is not part of this show.");
  if (state.seatForRole) {
    return refuse(`Seat for ${state.role.name} is already filled or offered.`);
  }
  if (!state.hasInterest) {
    return refuse("Performer must opt in for this role on this date first.");
  }
  if (state.performerActiveSeat) {
    return refuse(
      `That performer already holds ${state.performerActiveSeat.roleName} on this date.`,
    );
  }
  return allowed;
}

export function checkOfferResponse(
  seat: { status: "OFFERED" | "CONFIRMED" } | null,
): CastingDecision {
  if (!seat) return refuse("There is no offer to respond to.");
  if (seat.status !== "OFFERED") {
    return refuse("This offer is no longer available.");
  }
  return allowed;
}

/**
 * A confirmed seat is a commitment the performer made, so withdrawing one is
 * deliberately distinguished from retracting an unanswered offer.
 */
export function withdrawalNotice(
  seat: { status: "OFFERED" | "CONFIRMED"; roleName: string } | null,
): CastingDecision & { wasConfirmed?: boolean } {
  if (!seat) return refuse("No assignment to withdraw.");
  return seat.status === "CONFIRMED"
    ? { ok: true, wasConfirmed: true }
    : { ok: true, wasConfirmed: false };
}

export type SeatState = "Open" | "Offered" | "Confirmed";

export function seatState(
  assignment: { status: "OFFERED" | "CONFIRMED" } | null | undefined,
): SeatState {
  if (!assignment) return "Open";
  return assignment.status === "CONFIRMED" ? "Confirmed" : "Offered";
}
