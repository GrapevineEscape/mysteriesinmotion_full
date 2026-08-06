"use server";

import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function decision(value: FormDataEntryValue | null): ApplicationStatus | null {
  return value === "approve"
    ? "APPROVED"
    : value === "reject"
      ? "REJECTED"
      : null;
}

async function setStatus(ids: string[], status: ApplicationStatus) {
  if (!ids.length) return;
  await db.roleApplication.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  revalidatePath("/admin/applications");
}

/** Applies one decision to every ticked request. */
export async function reviewApplications(formData: FormData) {
  await requireAdmin();

  const status = decision(formData.get("action"));
  if (!status) return;

  await setStatus(
    formData
      .getAll("applicationId")
      .filter((value): value is string => typeof value === "string" && value !== ""),
    status,
  );
}

/**
 * The per-row decision carries its identifier in the action itself, so it never
 * depends on which checkboxes happen to be ticked.
 */
export async function reviewApplication(id: string, status: ApplicationStatus) {
  await requireAdmin();
  await setStatus([id], status);
}
