"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  evaluateShowReadiness,
  showReadinessInclude,
} from "@/lib/show-readiness";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function positiveInteger(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function updateShowConfiguration(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Show identifier is required.");

  const requestedPublication = formData.get("status") === "PUBLISHED";
  const show = await db.show.update({
    where: { id },
    data: {
      title: text(formData, "title") ?? undefined,
      shortDescription: text(formData, "shortDescription") ?? undefined,
      fullDescription: text(formData, "fullDescription") ?? undefined,
      coverImageUrl: text(formData, "coverImageUrl"),
      // Publication is granted only after the saved configuration passes the
      // complete readiness check below.
      status: "DRAFT",
      priceCents: 1000,
      introEnabled: checked(formData, "introEnabled"),
      introTitle: text(formData, "introTitle"),
      introVideoId: text(formData, "introVideoId"),
      introSkippable: checked(formData, "introSkippable"),
      introReplayable: checked(formData, "introReplayable"),
      actOneTitle: text(formData, "actOneTitle") ?? "Act One",
      actOneVideoId: text(formData, "actOneVideoId"),
      actOneCanPause: checked(formData, "actOneCanPause"),
      actOneRewindSeconds: 30,
      lockActOneAfterIntermission: true,
      intermissionTitle:
        text(formData, "intermissionTitle") ?? "Make Your Accusation",
      intermissionMediaType:
        formData.get("intermissionMediaType") === "VIDEO"
          ? "VIDEO"
          : formData.get("intermissionMediaType") === "IMAGE"
            ? "IMAGE"
            : "NONE",
      intermissionVideoId: text(formData, "intermissionVideoId"),
      intermissionImageUrl: text(formData, "intermissionImageUrl"),
      intermissionVideoLoops: checked(formData, "intermissionVideoLoops"),
      accusationTimed: checked(formData, "accusationTimed"),
      accusationSeconds: positiveInteger(formData, "accusationSeconds"),
      timerWarningSeconds: positiveInteger(formData, "timerWarningSeconds"),
      timerExpirationAction:
        formData.get("timerExpirationAction") === "MARK_UNANSWERED_INCORRECT"
          ? "MARK_UNANSWERED_INCORRECT"
          : "SUBMIT_CURRENT",
      actTwoTitle: text(formData, "actTwoTitle") ?? "The Reveal",
      actTwoVideoId: text(formData, "actTwoVideoId"),
      actTwoCanPause: checked(formData, "actTwoCanPause"),
      actTwoRewindSeconds: 30,
      inventoryEnabled: checked(formData, "inventoryEnabled"),
      situationRoomTitle:
        text(formData, "situationRoomTitle") ?? "So, how did you do?",
      resultsMusicEnabled: checked(formData, "resultsMusicEnabled"),
      resultsMusicUrl: text(formData, "resultsMusicUrl"),
      vaultTransitionEnabled: checked(formData, "vaultTransitionEnabled"),
      detectiveGaugeEnabled: checked(formData, "detectiveGaugeEnabled"),
    },
  });

  if (requestedPublication) {
    const configuredShow = await db.show.findUnique({
      where: { id: show.id },
      include: showReadinessInclude,
    });
    if (!configuredShow) throw new Error("The saved show could not be found.");

    const readiness = evaluateShowReadiness(configuredShow);
    if (!readiness.readyToPublish) {
      revalidatePath("/admin");
      revalidatePath(`/admin/shows/${show.slug}`);
      revalidatePath(`/admin/shows/${show.slug}/readiness`);
      redirect(`/admin/shows/${show.slug}/readiness?publish=blocked`);
    }

    await db.show.update({
      where: { id: show.id },
      data: { status: "PUBLISHED" },
    });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/shows/${show.slug}`);
  revalidatePath(`/admin/shows/${show.slug}/readiness`);
  revalidatePath(`/mysteries/${show.slug}`);
}
