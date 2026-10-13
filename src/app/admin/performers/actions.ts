"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Replace the shows a performer may open. Administrators stay unrestricted. */
export async function updatePerformerShows(formData: FormData) {
  await requireAdmin();
  const performerId = String(formData.get("performerId") ?? "");
  const performer = await db.user.findUnique({
    where: { id: performerId },
    select: { id: true, role: true },
  });
  if (!performer || performer.role === "CUSTOMER") {
    throw new Error("That person is not a troupe member.");
  }
  if (performer.role === "ADMIN") return;

  const openAccess = formData.get("access") === "open";
  if (openAccess) {
    await db.$transaction([
      db.user.update({
        where: { id: performer.id },
        data: { showAccessRestricted: false },
      }),
      db.performerShowAccess.deleteMany({ where: { userId: performer.id } }),
    ]);
  } else {
    const requested = formData.getAll("showId").map(String).filter(Boolean);
    const shows = requested.length
      ? await db.show.findMany({
          where: { id: { in: requested } },
          select: { id: true },
        })
      : [];
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: performer.id },
        data: { showAccessRestricted: true },
      });
      await tx.performerShowAccess.deleteMany({ where: { userId: performer.id } });
      if (shows.length) {
        await tx.performerShowAccess.createMany({
          data: shows.map((show) => ({
            userId: performer.id,
            showId: show.id,
          })),
        });
      }
    });
  }

  revalidatePath(`/admin/performers/${performer.id}`);
  revalidatePath("/troupe");
}
