"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ShowDateStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { castingEvent, syncCastStatus } from "@/lib/casting";
import { notifyCastingOpened, notifySeatConfirmed } from "@/lib/troupe-notices";
import { db } from "@/lib/db";
import { parseLocalDateTime } from "@/lib/app-time";
import { defaultTechDate } from "@/lib/rehearsal-schedule";
import type { WizardState } from "./wizard-state";

function text(value: FormDataEntryValue | null, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function optional(value: FormDataEntryValue | null, limit = 500) {
  return text(value, limit) || null;
}

/** A director must be a troupe member; anything else is treated as unassigned. */
async function resolveDirector(value: FormDataEntryValue | null) {
  const id = text(value, 40);
  if (!id) return null;
  const director = await db.user.findFirst({
    where: { id, role: { in: ["PERFORMER", "ADMIN"] } },
    select: { id: true },
  });
  return director?.id ?? null;
}

async function requireDraft(showDateId: string) {
  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    select: { id: true, status: true, showId: true, date: true },
  });
  if (!showDate) redirect("/admin/show-dates");
  // Leaving the wizard once a performance is live keeps the edit screen as the
  // single place where a published date can be changed.
  if (showDate.status !== "DRAFT") redirect(`/admin/casting/${showDate.id}`);
  return showDate;
}

export async function createShowDate(
  _previous: WizardState,
  formData: FormData,
): Promise<WizardState> {
  await requireAdmin();

  const showId = text(formData.get("showId"), 40);
  const date = parseLocalDateTime(formData.get("date"));
  const location = text(formData.get("location"), 200);

  const errors: string[] = [];
  if (!showId) errors.push("Choose which show is being performed.");
  if (!date) errors.push("Enter the date and time of the performance.");
  if (!location) errors.push("Enter where the performance takes place.");
  if (errors.length) return { errors };

  const showDate = await db.showDate.create({
    data: {
      showId,
      date: date!,
      location,
      customer: optional(formData.get("customer"), 200),
      notes: optional(formData.get("notes"), 2_000),
      attendees: Number(formData.get("attendees")) || null,
      directorId: await resolveDirector(formData.get("directorId")),
      status: "DRAFT",
      requiredRehearsals: 0,
    },
  });

  castingEvent("wizard_created", { showDateId: showDate.id });
  revalidatePath("/admin/show-dates");
  redirect(`/admin/show-dates/${showDate.id}/cast`);
}

/**
 * Step two, optional pre-casting. Revisiting replaces the wizard's seats rather
 * than adding to them, so stepping back and forth cannot double-book a role.
 */
export async function saveWizardCast(
  _previous: WizardState,
  formData: FormData,
): Promise<WizardState> {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);
  const showDate = await requireDraft(showDateId);

  if (formData.get("action") === "skip") {
    redirect(`/admin/show-dates/${showDate.id}/rehearsals`);
  }

  const roles = await db.role.findMany({
    where: { showId: showDate.showId },
    select: { id: true },
  });

  const warnings: string[] = [];
  const seats: { roleId: string; performerId: string }[] = [];
  const taken = new Map<string, string>();

  for (const role of roles) {
    const performerId = text(formData.get(`role-${role.id}`), 40);
    if (!performerId) continue;
    if (taken.has(performerId)) {
      warnings.push(
        "A performer can only hold one seat per performance, so the duplicate was skipped.",
      );
      continue;
    }
    taken.set(performerId, role.id);
    seats.push({ roleId: role.id, performerId });
  }

  const previous = await db.showDateAssignment.findMany({
    where: { showDateId: showDate.id, status: "CONFIRMED" },
    select: { roleId: true, performerId: true },
  });
  const alreadyConfirmed = new Set(
    previous.map((seat) => `${seat.roleId}:${seat.performerId}`),
  );

  await db.$transaction(async (tx) => {
    await tx.showDateAssignment.deleteMany({ where: { showDateId: showDate.id } });
    if (seats.length) {
      await tx.showDateAssignment.createMany({
        data: seats.map((seat) => ({
          showDateId: showDate.id,
          ...seat,
          status: "CONFIRMED" as const,
        })),
      });
    }
    await syncCastStatus(tx, showDate.id);
  });

  for (const seat of seats) {
    castingEvent("wizard_precast", { showDateId: showDate.id, ...seat });
    if (alreadyConfirmed.has(`${seat.roleId}:${seat.performerId}`)) continue;
    await notifySeatConfirmed(showDate.id, seat.roleId, seat.performerId);
  }

  if (warnings.length) return { errors: warnings };
  redirect(`/admin/show-dates/${showDate.id}/rehearsals`);
}

/** Step three: replace the rehearsal schedule with whatever the form shows. */
export async function saveWizardRehearsals(
  _previous: WizardState,
  formData: FormData,
): Promise<WizardState> {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);
  const showDate = await requireDraft(showDateId);

  const fallbackLocation =
    (
      await db.showDate.findUniqueOrThrow({
        where: { id: showDate.id },
        select: { location: true },
      })
    ).location ?? "";

  // Each row's fields are keyed by its own index rather than submitted as
  // parallel lists, so unticking a row cannot shift the others out of step.
  const rehearsals = formData
    .getAll("include")
    .map(String)
    .map((key) => ({
      date: parseLocalDateTime(formData.get(`rehearsalDate-${key}`)),
      location:
        text(formData.get(`rehearsalLocation-${key}`), 200) || fallbackLocation,
    }))
    .filter((entry) => entry.date);

  const includeTech = Boolean(formData.get("includeTech"));
  const techDate = includeTech
    ? (parseLocalDateTime(formData.get("techDate")) ?? defaultTechDate(showDate.date))
    : null;

  await db.$transaction(async (tx) => {
    await tx.rehearsal.deleteMany({ where: { showDateId: showDate.id } });
    if (rehearsals.length) {
      await tx.rehearsal.createMany({
        data: rehearsals.map((entry) => ({
          showDateId: showDate.id,
          date: entry.date!,
          location: entry.location,
        })),
      });
    }
    await tx.showDate.update({
      where: { id: showDate.id },
      data: {
        requiredRehearsals: rehearsals.length,
        rehearsalTimeframe: Number(formData.get("rehearsalTimeframe")) || 14,
        techDate,
        techLocation: techDate
          ? text(formData.get("techLocation"), 200) || fallbackLocation
          : null,
      },
    });
  });

  redirect(`/admin/show-dates/${showDate.id}/publish`);
}

/** Step four: open casting, or park the performance as a draft. */
export async function publishShowDate(formData: FormData) {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);
  const showDate = await requireDraft(showDateId);

  if (formData.get("action") === "draft") {
    redirect(`/admin/show-dates/${showDate.id}`);
  }

  await db.$transaction(async (tx) => {
    await tx.showDate.update({
      where: { id: showDate.id },
      data: { status: "OPEN" },
    });
    await syncCastStatus(tx, showDate.id);
  });

  castingEvent("casting_opened", { showDateId: showDate.id });
  await notifyCastingOpened(showDate.id);
  revalidatePath("/admin/show-dates");
  redirect(`/admin/casting/${showDate.id}`);
}

const EDITABLE_STATUSES: ShowDateStatus[] = [
  "DRAFT",
  "OPEN",
  "FULLY_CAST",
  "CLOSED",
  "CANCELED",
];

export async function updateShowDate(
  _previous: WizardState,
  formData: FormData,
): Promise<WizardState> {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);

  const existing = await db.showDate.findUnique({
    where: { id: showDateId },
    select: { id: true, status: true },
  });
  if (!existing) redirect("/admin/show-dates");

  const date = parseLocalDateTime(formData.get("date"));
  const location = text(formData.get("location"), 200);
  if (!date) return { errors: ["Enter the date and time of the performance."] };
  if (!location) return { errors: ["Enter where the performance takes place."] };

  const statusInput = text(formData.get("status"), 20) as ShowDateStatus;
  const status = EDITABLE_STATUSES.includes(statusInput)
    ? statusInput
    : existing.status;

  const includeTech = Boolean(formData.get("includeTech"));
  const techDate = includeTech ? parseLocalDateTime(formData.get("techDate")) : null;

  await db.$transaction(async (tx) => {
    await tx.showDate.update({
      where: { id: existing.id },
      data: {
        date,
        location,
        status,
        customer: optional(formData.get("customer"), 200),
        notes: optional(formData.get("notes"), 2_000),
        attendees: Number(formData.get("attendees")) || null,
        directorId: await resolveDirector(formData.get("directorId")),
        techDate,
        techLocation: techDate
          ? text(formData.get("techLocation"), 200) || location
          : null,
      },
    });
    await syncCastStatus(tx, existing.id);
  });

  if (status === "OPEN" && existing.status !== "OPEN") {
    castingEvent("casting_opened", { showDateId: existing.id });
    await notifyCastingOpened(existing.id);
  }

  revalidatePath("/admin/show-dates");
  revalidatePath(`/admin/show-dates/${existing.id}`);
  return { errors: [], saved: true };
}

export async function saveRehearsal(formData: FormData) {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);
  const rehearsalId = text(formData.get("rehearsalId"), 40);
  const date = parseLocalDateTime(formData.get("date"));
  if (!date) redirect(`/admin/show-dates/${showDateId}`);

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    select: { location: true },
  });

  const data = {
    date,
    location: text(formData.get("location"), 200) || showDate?.location || "",
    notes: optional(formData.get("notes"), 1_000),
  };

  if (rehearsalId) {
    await db.rehearsal.update({ where: { id: rehearsalId }, data });
  } else {
    await db.rehearsal.create({ data: { ...data, showDateId } });
  }

  await db.showDate.update({
    where: { id: showDateId },
    data: {
      requiredRehearsals: await db.rehearsal.count({ where: { showDateId } }),
    },
  });

  revalidatePath(`/admin/show-dates/${showDateId}`);
  redirect(`/admin/show-dates/${showDateId}`);
}

export async function deleteRehearsal(formData: FormData) {
  await requireAdmin();
  const rehearsalId = text(formData.get("rehearsalId"), 40);

  const rehearsal = await db.rehearsal.findUnique({
    where: { id: rehearsalId },
    select: { showDateId: true },
  });
  if (!rehearsal) redirect("/admin/show-dates");

  await db.rehearsal.delete({ where: { id: rehearsalId } });
  await db.showDate.update({
    where: { id: rehearsal.showDateId },
    data: {
      requiredRehearsals: await db.rehearsal.count({
        where: { showDateId: rehearsal.showDateId },
      }),
    },
  });

  revalidatePath(`/admin/show-dates/${rehearsal.showDateId}`);
  redirect(`/admin/show-dates/${rehearsal.showDateId}`);
}

export async function deleteShowDate(formData: FormData) {
  await requireAdmin();
  const showDateId = text(formData.get("showDateId"), 40);

  // Typing DELETE is the same safeguard the Flask calendar used, kept because
  // removing a performance also removes its casting history.
  if (text(formData.get("confirmation"), 20) !== "DELETE") {
    redirect(`/admin/show-dates/${showDateId}?error=confirmation`);
  }

  await db.showDate.delete({ where: { id: showDateId } });
  revalidatePath("/admin/show-dates");
  redirect("/admin/show-dates");
}
