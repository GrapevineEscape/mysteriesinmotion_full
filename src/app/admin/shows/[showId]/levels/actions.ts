"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_SITUATION_RANK_BANDS } from "@/lib/situation-room-types";

const MAX_LEVEL_NAME_LENGTH = 80;

export async function updateDetectiveLevelNames(formData: FormData) {
  await requireAdmin();
  const showId = String(formData.get("showId") ?? "").trim();
  if (!showId) throw new Error("Show identifier is required.");

  const names = DEFAULT_SITUATION_RANK_BANDS.map((band) =>
    String(formData.get(`levelName-${band.minimumPercent}`) ?? "")
      .trim()
      .slice(0, MAX_LEVEL_NAME_LENGTH),
  );
  if (names.some((name) => !name)) {
    throw new Error("Every detective level needs a name.");
  }

  const show = await db.show.findUnique({
    where: { id: showId },
    select: { slug: true },
  });
  if (!show) throw new Error("The show could not be found.");

  await db.$transaction(async (transaction) => {
    await transaction.resultTier.deleteMany({ where: { showId } });
    await transaction.resultTier.createMany({
      data: DEFAULT_SITUATION_RANK_BANDS.map((band, index) => ({
        showId,
        name: names[index],
        description: `Scores from ${band.minimumPercent}% through ${band.maximumPercent}%.`,
        minimumPercent: band.minimumPercent,
        maximumPercent: band.maximumPercent,
      })),
    });
  });

  revalidatePath(`/admin/shows/${show.slug}`);
  revalidatePath(`/admin/shows/${show.slug}/levels`);
  revalidatePath(`/admin/shows/${show.slug}/readiness`);
  revalidatePath(`/play/${show.slug}`);
  redirect(`/admin/shows/${show.slug}/levels?saved=1`);
}
