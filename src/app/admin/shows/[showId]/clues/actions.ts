"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function unlockStage(value: FormDataEntryValue | null) {
  if (value === "ACT_TWO") return "ACT_TWO" as const;
  if (value === "INTERMISSION") return "INTERMISSION" as const;
  return "ACT_ONE" as const;
}

function parseTimecode(value: string) {
  const match = /^(\d{2}):([0-5]\d):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Time code must use HH:MM:SS.");
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export async function createClue(formData: FormData) {
  await requireAdmin();
  const showId = String(formData.get("showId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!showId || !title) throw new Error("Show and clue name are required.");
  const count = await db.evidenceItem.count({ where: { showId } });

  await db.$transaction([
    db.evidenceItem.create({
      data: {
        showId,
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        fileUrl: String(formData.get("fileUrl") ?? "").trim() || null,
        iconUrl: String(formData.get("iconUrl") ?? "").trim() || null,
        unlockStage: unlockStage(formData.get("unlockStage")),
        unlockAtSeconds: parseTimecode(String(formData.get("timecode") ?? "")),
        displayOrder: count,
        visibleDuringReveal: formData.get("visibleDuringReveal") === "on",
        visibleDuringIntermission:
          formData.get("visibleDuringIntermission") === "on",
      },
    }),
    db.onlineShowDetail.upsert({
      where: { showId },
      update: { inventoryEnabled: true },
      create: { showId, inventoryEnabled: true },
    }),
  ]);

  revalidatePath(`/admin/shows/${String(formData.get("slug") ?? "")}/clues`);
}

export async function updateClue(formData: FormData) {
  await requireAdmin();
  const clueId = String(formData.get("clueId") ?? "");
  const showId = String(formData.get("showId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!clueId || !showId || !title) {
    throw new Error("Show, clue, and clue name are required.");
  }

  const result = await db.evidenceItem.updateMany({
    where: { id: clueId, showId },
    data: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      fileUrl: String(formData.get("fileUrl") ?? "").trim() || null,
      iconUrl: String(formData.get("iconUrl") ?? "").trim() || null,
      unlockStage: unlockStage(formData.get("unlockStage")),
      unlockAtSeconds: parseTimecode(String(formData.get("timecode") ?? "")),
      visibleDuringReveal: formData.get("visibleDuringReveal") === "on",
      visibleDuringIntermission:
        formData.get("visibleDuringIntermission") === "on",
    },
  });

  if (result.count !== 1) {
    throw new Error("The selected clue could not be found.");
  }

  revalidatePath(`/admin/shows/${String(formData.get("slug") ?? "")}/clues`);
}
