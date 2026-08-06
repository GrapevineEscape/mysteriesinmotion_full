import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { displayName, nameSortKey } from "@/lib/people";

/**
 * Loads a performance that is still in setup. A published performance is sent to
 * its casting board, so the wizard is never a way to edit a live show date.
 */
export async function requireDraftShowDate(showDateId: string) {
  await requireAdmin();

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: {
      show: { select: { id: true, title: true, slug: true } },
      director: true,
      rehearsals: { orderBy: { date: "asc" } },
      assignments: { include: { performer: true, role: true } },
    },
  });
  if (!showDate) notFound();
  if (showDate.status !== "DRAFT") redirect(`/admin/casting/${showDate.id}`);

  return showDate;
}

/** Troupe members who can be cast, ordered the way a cast list reads. */
export async function castablePerformers() {
  const performers = await db.user.findMany({
    where: { role: { in: ["PERFORMER", "ADMIN"] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  return performers
    .map((performer) => ({
      id: performer.id,
      label: displayName(performer),
      sortKey: nameSortKey(performer),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
