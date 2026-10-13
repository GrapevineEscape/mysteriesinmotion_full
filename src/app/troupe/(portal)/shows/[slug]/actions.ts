"use server";

import { revalidatePath } from "next/cache";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedShowIds, canSeeShow } from "@/lib/show-access";

/**
 * Standing roster interest in a character, not a booking for a specific date.
 * Recorded once per performer per role; re-submitting is a no-op so a double
 * click cannot create a duplicate.
 */
export async function addRosterInterest(formData: FormData) {
  const member = await requireTroupe();
  const roleId = String(formData.get("roleId") ?? "");
  if (!roleId) return;

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { show: { select: { slug: true } } },
  });
  if (!role) return;
  const allowed = await allowedShowIds(member);
  if (!canSeeShow(allowed, role.showId)) return;

  await db.roleApplication.upsert({
    where: { performerId_roleId: { performerId: member.id, roleId } },
    update: {},
    create: { performerId: member.id, roleId, showId: role.showId },
  });

  revalidatePath(`/troupe/shows/${role.show.slug}`);
  revalidatePath("/troupe");
}
