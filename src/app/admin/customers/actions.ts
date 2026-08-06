"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { issueLoginCode, normalizeEmail, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendLoginCode } from "@/lib/email";
import {
  entitlementStartDeadline,
  findStartableEntitlement,
} from "@/lib/entitlements";

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function returnToCustomer(email: string, notice: string): never {
  redirect(
    `/admin/customers?q=${encodeURIComponent(email)}&notice=${encodeURIComponent(
      notice,
    )}`,
  );
}

export async function grantComplimentaryAccess(formData: FormData) {
  await requireAdmin();
  const userId = required(formData, "userId");
  const showId = required(formData, "showId");
  const email = normalizeEmail(required(formData, "email"));

  const [existing, activeAttempt, show] = await Promise.all([
    findStartableEntitlement(userId, showId),
    db.caseAttempt.findFirst({
      where: {
        userId,
        showId,
        completedAt: null,
        investigationStartedAt: { not: null },
        purchase: { status: { in: ["PAID", "COMPLIMENTARY"] } },
      },
      select: { id: true },
    }),
    db.show.findUnique({
      where: { id: showId },
      select: { title: true },
    }),
  ]);
  if (!show) returnToCustomer(email, "The mystery could not be found.");
  if (existing || activeAttempt) {
    returnToCustomer(
      email,
      `${show.title} already has current access; it was not changed.`,
    );
  }

  const now = new Date();
  const purchase = await db.purchase.create({
    data: {
      userId,
      showId,
      status: "COMPLIMENTARY",
      amountCents: 0,
      currency: "usd",
      purchasedAt: now,
      startByAt: entitlementStartDeadline(now),
    },
    include: { show: { select: { title: true } } },
  });

  revalidatePath("/admin/customers");
  revalidatePath("/my-cases");
  returnToCustomer(email, `Complimentary access granted for ${purchase.show.title}.`);
}

export async function updateAccessState(formData: FormData) {
  await requireAdmin();
  const purchaseId = required(formData, "purchaseId");
  const email = normalizeEmail(required(formData, "email"));
  const requested = required(formData, "status");
  if (!["RESTORE", "REFUNDED", "PENDING", "DISPUTED"].includes(requested)) {
    returnToCustomer(email, "Choose a valid access action.");
  }

  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      show: { select: { id: true, title: true } },
      user: { select: { id: true } },
    },
  });
  if (!purchase) returnToCustomer(email, "The access record could not be found.");

  const status =
    requested === "RESTORE"
      ? purchase.amountCents > 0
        ? "PAID"
        : "COMPLIMENTARY"
      : requested === "REFUNDED"
        ? "REFUNDED"
        : requested === "PENDING"
          ? "PENDING"
          : "DISPUTED";

  if (status === "REFUNDED") {
    const streamingEvidence = await db.caseAttempt.findFirst({
      where: {
        purchaseId: purchase.id,
        OR: [
          { investigationStartedAt: { not: null } },
          { furthestIntroSeconds: { gt: 0 } },
          { furthestActOneSeconds: { gt: 0 } },
          { furthestActTwoSeconds: { gt: 0 } },
          { accusationSubmittedAt: { not: null } },
        ],
      },
      select: { id: true },
    });
    if (purchase.playWindowStartedAt || streamingEvidence) {
      returnToCustomer(
        email,
        `Refund status was blocked for ${purchase.show.title}: saved gameplay shows that streaming began. You can still suspend access.`,
      );
    }
  }

  const now = new Date();
  await db.purchase.update({
    where: { id: purchase.id },
    data:
      requested === "RESTORE"
        ? {
            status,
            startByAt: entitlementStartDeadline(now),
            playWindowStartedAt: null,
            playWindowEndsAt: null,
          }
        : { status },
  });

  revalidatePath("/admin/customers");
  revalidatePath("/my-cases");
  returnToCustomer(
    email,
    `${purchase.show.title} access state changed to ${status.toLowerCase()}.`,
  );
}

export async function resetActiveAttempt(formData: FormData) {
  await requireAdmin();
  const attemptId = required(formData, "attemptId");
  const userId = required(formData, "userId");
  const email = normalizeEmail(required(formData, "email"));

  const attempt = await db.caseAttempt.findFirst({
    where: {
      id: attemptId,
      userId,
      completedAt: null,
    },
    include: { show: { select: { title: true, slug: true } } },
  });
  if (!attempt) {
    returnToCustomer(email, "No resettable active playthrough was found.");
  }

  await db.$transaction([
    db.submittedAnswer.deleteMany({ where: { attemptId: attempt.id } }),
    db.evidenceUnlock.deleteMany({ where: { attemptId: attempt.id } }),
    db.caseAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "NOT_STARTED",
        accusationSubmittedAt: null,
        revealStartedAt: null,
        completedAt: null,
        score: null,
        resultTierName: null,
        playbackStage: "NOT_STARTED",
        progressRevision: 0,
        furthestIntroSeconds: 0,
        furthestActOneSeconds: 0,
        furthestActTwoSeconds: 0,
        playbackUpdatedAt: null,
        intermissionStartedAt: null,
        timerExpiresAt: null,
        draftAnswers: Prisma.DbNull,
        maximumScore: null,
        scorePercent: null,
      },
    }),
  ]);

  revalidatePath("/admin/customers");
  revalidatePath(`/play/${attempt.show.slug}`);
  revalidatePath("/my-cases");
  returnToCustomer(
    email,
    `The active ${attempt.show.title} playthrough was safely reset. Completed history was not changed.`,
  );
}

export async function resendLoginCode(formData: FormData) {
  await requireAdmin();
  const email = normalizeEmail(required(formData, "email"));
  let notice: string;
  try {
    const login = await issueLoginCode(email);
    await sendLoginCode(login);
    notice = `A new sign-in code was sent to ${email}.`;
  } catch (error) {
    console.error("Administrator login-code resend failed", error);
    notice =
      "The sign-in code could not be delivered. Check the Render email settings and Resend logs.";
  }
  returnToCustomer(email, notice);
}
