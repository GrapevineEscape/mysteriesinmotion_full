"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { offerSeat, requireCastingManager, withdrawSeat } from "@/lib/casting";
import type { CastingBoardState } from "./board-state";

async function authorize(showDateId: string) {
  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    select: { id: true, directorId: true },
  });
  if (!showDate) return null;
  await requireCastingManager(showDate);
  return showDate;
}

export async function offer(
  _previous: CastingBoardState,
  formData: FormData,
): Promise<CastingBoardState> {
  const showDateId = String(formData.get("showDateId") ?? "");
  const showDate = await authorize(showDateId);
  if (!showDate) return { ok: false, message: "That show date no longer exists." };

  const result = await offerSeat(
    showDate.id,
    String(formData.get("roleId") ?? ""),
    String(formData.get("performerId") ?? ""),
  );

  revalidatePath(`/admin/casting/${showDate.id}`);
  return result;
}

export async function withdraw(
  _previous: CastingBoardState,
  formData: FormData,
): Promise<CastingBoardState> {
  const showDateId = String(formData.get("showDateId") ?? "");
  const showDate = await authorize(showDateId);
  if (!showDate) return { ok: false, message: "That show date no longer exists." };

  const result = await withdrawSeat(
    showDate.id,
    String(formData.get("roleId") ?? ""),
  );

  revalidatePath(`/admin/casting/${showDate.id}`);
  return result;
}
