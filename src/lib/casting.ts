import type { Prisma, User } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkOffer,
  checkOfferResponse,
  seatState,
  withdrawalNotice,
  type CastingDecision,
} from "@/lib/casting-rules";
import { nextCastStatus } from "@/lib/show-date-lifecycle";
import { notifyRoleOffered, notifySeatConfirmed } from "@/lib/troupe-notices";

type Client = Prisma.TransactionClient | typeof db;

/**
 * Casting lifecycle events. Logged for now; this is the seam where performer
 * notification emails will hook in.
 */
export function castingEvent(kind: string, payload: Record<string, unknown>) {
  console.info("casting_event", kind, payload);
}

/** Admins manage any performance; a director manages the ones assigned to them. */
export function canManageCasting(
  user: Pick<User, "id" | "role"> | null,
  showDate: { directorId: string | null },
) {
  if (!user) return false;
  return user.role === "ADMIN" || showDate.directorId === user.id;
}

/**
 * Casting is the one part of administration a director reaches without being an
 * administrator, and only for the performances assigned to them.
 */
export async function requireCastingManager(showDate: {
  directorId: string | null;
}) {
  const user = await requireTroupe();
  if (!canManageCasting(user, showDate)) redirect("/troupe");
  return user;
}

export function activeSeatForPerformer(
  client: Client,
  showDateId: string,
  performerId: string,
) {
  return client.showDateAssignment.findFirst({
    where: { showDateId, performerId },
    include: { role: true },
  });
}

/**
 * Recomputes FULLY_CAST after any seat change. Runs inside the caller's
 * transaction so the status can never disagree with the seats behind it.
 */
export async function syncCastStatus(client: Client, showDateId: string) {
  const showDate = await client.showDate.findUnique({
    where: { id: showDateId },
    select: { id: true, status: true, showId: true },
  });
  if (!showDate) return null;

  const [roleCount, confirmedCount] = await Promise.all([
    client.role.count({ where: { showId: showDate.showId } }),
    client.showDateAssignment.count({
      where: { showDateId, status: "CONFIRMED" },
    }),
  ]);

  const status = nextCastStatus(showDate.status, roleCount, confirmedCount);
  if (status === showDate.status) return showDate.status;

  await client.showDate.update({ where: { id: showDateId }, data: { status } });
  return status;
}

export type CastingResult = { ok: boolean; message: string };

/** Offers a seat to a performer who opted in. */
export async function offerSeat(
  showDateId: string,
  roleId: string,
  performerId: string,
): Promise<CastingResult> {
  return db.$transaction(async (tx) => {
    const showDate = await tx.showDate.findUnique({
      where: { id: showDateId },
      select: { id: true, showId: true },
    });
    if (!showDate) return { ok: false, message: "That show date no longer exists." };

    const [role, seatForRole, interest, activeSeat] = await Promise.all([
      tx.role.findFirst({ where: { id: roleId, showId: showDate.showId } }),
      tx.showDateAssignment.findUnique({
        where: { showDateId_roleId: { showDateId, roleId } },
      }),
      tx.showDateInterest.findUnique({
        where: {
          showDateId_roleId_performerId: { showDateId, roleId, performerId },
        },
      }),
      activeSeatForPerformer(tx, showDateId, performerId),
    ]);

    const decision = checkOffer({
      role,
      seatForRole,
      hasInterest: Boolean(interest),
      performerActiveSeat: activeSeat ? { roleName: activeSeat.role.name } : null,
    });
    if (!decision.ok) return decision;

    await tx.showDateAssignment.create({
      data: { showDateId, roleId, performerId, status: "OFFERED" },
    });
    await syncCastStatus(tx, showDateId);
    castingEvent("offered", { showDateId, roleId, performerId });

    return {
      ok: true,
      message: `Offered ${role!.name}. The performer still needs to accept.`,
    };
  }).then(async (result) => {
    if (result.ok) await notifyRoleOffered(showDateId, roleId, performerId);
    return result;
  });
}

/** Retracts an offer or removes a confirmed performer from a seat. */
export async function withdrawSeat(
  showDateId: string,
  roleId: string,
): Promise<CastingResult> {
  return db.$transaction(async (tx) => {
    const seat = await tx.showDateAssignment.findUnique({
      where: { showDateId_roleId: { showDateId, roleId } },
      include: { role: true },
    });

    const decision = withdrawalNotice(
      seat ? { status: seat.status, roleName: seat.role.name } : null,
    );
    if (!decision.ok) return decision;

    await tx.showDateAssignment.delete({ where: { id: seat!.id } });
    await syncCastStatus(tx, showDateId);
    castingEvent("withdrawn", {
      showDateId,
      roleId,
      performerId: seat!.performerId,
    });

    return {
      ok: true,
      message: decision.wasConfirmed
        ? `Removed ${seat!.role.name} from the cast. The seat is open again.`
        : `Withdrew the offer for ${seat!.role.name}.`,
    };
  });
}

async function respondToOffer(
  assignmentId: string,
  performerId: string,
  accept: boolean,
): Promise<CastingResult> {
  return db.$transaction(async (tx) => {
    const seat = await tx.showDateAssignment.findFirst({
      where: { id: assignmentId, performerId },
      include: { role: true },
    });

    const decision: CastingDecision = checkOfferResponse(seat);
    if (!decision.ok) return decision;

    const { showDateId, roleId, role } = seat!;

    if (accept) {
      await tx.showDateAssignment.update({
        where: { id: seat!.id },
        data: { status: "CONFIRMED" },
      });
    } else {
      await tx.showDateAssignment.delete({ where: { id: seat!.id } });
    }

    await syncCastStatus(tx, showDateId);
    castingEvent(accept ? "accepted" : "declined", {
      showDateId,
      roleId,
      performerId,
    });

    return {
      ok: true,
      notified: accept,
      showDateId,
      roleId,
      message: accept
        ? `You are confirmed as ${role.name}.`
        : `You declined ${role.name}. The seat is open again.`,
    };
  }).then(async (result) => {
    if (result.ok && result.notified) {
      await notifySeatConfirmed(result.showDateId, result.roleId, performerId);
    }
    return result;
  });
}

export function acceptOffer(assignmentId: string, performerId: string) {
  return respondToOffer(assignmentId, performerId, true);
}

export function declineOffer(assignmentId: string, performerId: string) {
  return respondToOffer(assignmentId, performerId, false);
}

/**
 * Who is on the roster for each role of a show: the performers whose standing
 * interest an admin approved. These are the people a seat can be offered to.
 */
export async function rosterByRole(showId: string) {
  const approved = await db.roleApplication.findMany({
    where: { showId, status: "APPROVED" },
    include: { performer: true },
    orderBy: [
      { performer: { lastName: "asc" } },
      { performer: { firstName: "asc" } },
    ],
  });

  const byRole = new Map<string, typeof approved>();
  for (const application of approved) {
    const bucket = byRole.get(application.roleId) ?? [];
    bucket.push(application);
    byRole.set(application.roleId, bucket);
  }
  return byRole;
}

function loadBoardAssignments(showDateId: string) {
  return db.showDateAssignment.findMany({
    where: { showDateId },
    include: { performer: true, role: true },
  });
}

function loadBoardInterests(showDateId: string) {
  return db.showDateInterest.findMany({
    where: { showDateId },
    include: { performer: true },
    orderBy: [
      { performer: { lastName: "asc" } },
      { performer: { firstName: "asc" } },
    ],
  });
}

/** Per-role view of who wants each part and who currently holds it. */
export async function castingBoard(showDate: { id: string; showId: string }) {
  const [roles, assignments, interests] = await Promise.all([
    db.role.findMany({
      where: { showId: showDate.showId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    loadBoardAssignments(showDate.id),
    loadBoardInterests(showDate.id),
  ]);

  const assignmentByRole = new Map(assignments.map((a) => [a.roleId, a]));
  const interestsByRole = new Map<string, typeof interests>();
  for (const interest of interests) {
    const bucket = interestsByRole.get(interest.roleId) ?? [];
    bucket.push(interest);
    interestsByRole.set(interest.roleId, bucket);
  }

  return roles.map((role) => {
    const assignment = assignmentByRole.get(role.id) ?? null;
    return {
      role,
      seat: seatState(assignment),
      assignment,
      interested: interestsByRole.get(role.id) ?? [],
    };
  });
}
