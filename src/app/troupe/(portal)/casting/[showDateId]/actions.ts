"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedShowIds, canSeeShow } from "@/lib/show-access";
import { acceptOffer, castingEvent, declineOffer } from "@/lib/casting";
import { isCastingOpen } from "@/lib/show-date-lifecycle";

import type { OfferResponseState } from "./offer-response-state";

/** Accept or decline the seat the performer was offered on this date. */
export async function respondToOffer(
  _previous: OfferResponseState,
  formData: FormData,
): Promise<OfferResponseState> {
  const member = await requireTroupe();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  if (!assignmentId || (intent !== "accept" && intent !== "decline")) {
    return { ok: false, message: "That response could not be recorded." };
  }

  const result =
    intent === "accept"
      ? await acceptOffer(assignmentId, member.id)
      : await declineOffer(assignmentId, member.id);

  revalidatePath("/troupe");
  revalidatePath("/troupe/casting");
  return { ok: result.ok, message: result.message };
}

/**
 * Records or updates the performer's application for one role on one date,
 * including the rehearsals they cannot make.
 */
export async function saveApplication(formData: FormData) {
  const member = await requireTroupe();
  const showDateId = String(formData.get("showDateId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: { rehearsals: { select: { id: true } } },
  });
  if (!showDate || !isCastingOpen(showDate)) redirect("/troupe/casting");
  const allowed = await allowedShowIds(member);
  if (!canSeeShow(allowed, showDate.showId)) redirect("/troupe/casting");

  const role = await db.role.findFirst({
    where: { id: roleId, showId: showDate.showId },
  });
  if (!role) redirect(`/troupe/casting/${showDateId}`);

  // A confirmed seat belongs to someone else; applying would be misleading.
  const seat = await db.showDateAssignment.findUnique({
    where: { showDateId_roleId: { showDateId, roleId } },
  });
  if (seat?.status === "CONFIRMED") redirect(`/troupe/casting/${showDateId}`);

  const validRehearsalIds = new Set(showDate.rehearsals.map((r) => r.id));
  const conflictRehearsalIds = formData
    .getAll("conflictRehearsalId")
    .map(String)
    .filter((id) => validRehearsalIds.has(id));

  const questions =
    String(formData.get("questions") ?? "")
      .trim()
      .slice(0, 2_000) || null;
  const conflictTech = Boolean(formData.get("conflictTech")) && Boolean(showDate.techDate);

  const existing = await db.showDateInterest.findUnique({
    where: {
      showDateId_roleId_performerId: { showDateId, roleId, performerId: member.id },
    },
    select: { id: true },
  });

  await db.showDateInterest.upsert({
    where: {
      showDateId_roleId_performerId: { showDateId, roleId, performerId: member.id },
    },
    update: { conflictRehearsalIds, conflictTech, questions },
    create: {
      showDateId,
      roleId,
      performerId: member.id,
      conflictRehearsalIds,
      conflictTech,
      questions,
    },
  });

  castingEvent(existing ? "interest_updated" : "interest_expressed", {
    showDateId,
    roleId,
    performerId: member.id,
  });

  revalidatePath(`/troupe/casting/${showDateId}`);
  revalidatePath("/troupe/casting");
  redirect(`/troupe/casting/${showDateId}`);
}

/** Withdraws an application the performer no longer wants to be considered for. */
export async function withdrawApplication(formData: FormData) {
  const member = await requireTroupe();
  const showDateId = String(formData.get("showDateId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  await db.showDateInterest.deleteMany({
    where: { showDateId, roleId, performerId: member.id },
  });
  castingEvent("interest_withdrawn", {
    showDateId,
    roleId,
    performerId: member.id,
  });

  revalidatePath(`/troupe/casting/${showDateId}`);
  revalidatePath("/troupe/casting");
  redirect(`/troupe/casting/${showDateId}`);
}
