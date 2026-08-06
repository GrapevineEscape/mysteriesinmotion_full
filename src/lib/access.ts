import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  findStartableEntitlement,
  gameCanContinue,
  isActiveEntitlementStatus,
} from "@/lib/entitlements";

export async function requireCaseAccess(slug: string) {
  const user = await requireUser(`/play/${slug}`);
  const show = await db.show.findUnique({
    where: { slug },
    include: {
      online: true,
      evidenceItems: { orderBy: { displayOrder: "asc" } },
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { choices: { orderBy: { displayOrder: "asc" } } },
      },
      resultTiers: { orderBy: { minimumPercent: "asc" } },
    },
  });
  if (!show) notFound();

  // Only online productions have a Case Room to enter. Rebuilding the object
  // carries the non-null narrowing through to callers.
  const { online, ...showBase } = show;
  if (!online) notFound();
  const onlineShow = { ...showBase, online };

  const activeAttempt = await db.caseAttempt.findFirst({
    where: {
      userId: user.id,
      showId: show.id,
      completedAt: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      purchase: true,
      unlockedEvidence: { select: { evidenceItemId: true } },
    },
  });

  if (user.role === "ADMIN") {
    const attempt =
      activeAttempt ??
      (await db.caseAttempt.create({
        data: { userId: user.id, showId: show.id },
        include: {
          purchase: true,
          unlockedEvidence: { select: { evidenceItemId: true } },
        },
      }));
    return { attempt, entitlement: null, show: onlineShow, user };
  }

  // A game that genuinely began before expiration remains available until that
  // exact playthrough is completed.
  if (activeAttempt && gameCanContinue(activeAttempt)) {
    return {
      attempt: activeAttempt,
      entitlement: activeAttempt.purchase,
      show: onlineShow,
      user,
    };
  }

  const entitlement = await findStartableEntitlement(user.id, show.id);
  if (!entitlement) {
    const latestPurchase = await db.purchase.findFirst({
      where: { userId: user.id, showId: show.id },
      orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
    });
    const expired =
      latestPurchase && isActiveEntitlementStatus(latestPurchase.status);
    redirect(`/mysteries/${slug}?access=${expired ? "expired" : "required"}`);
  }

  if (activeAttempt?.purchaseId === entitlement.id) {
    return { attempt: activeAttempt, entitlement, show: onlineShow, user };
  }

  // A stale briefing that never streamed is not a started game. Remove it so a
  // newer entitlement can create the one allowed active playthrough.
  if (activeAttempt && !activeAttempt.investigationStartedAt) {
    await db.caseAttempt.delete({ where: { id: activeAttempt.id } });
  } else if (activeAttempt) {
    await db.caseAttempt.update({
      where: { id: activeAttempt.id },
      data: {
        completedAt: new Date(),
        playbackStage: "COMPLETED",
        status: "COMPLETED",
      },
    });
  }

  const attempt = await db.caseAttempt.create({
      data: {
        userId: user.id,
        showId: show.id,
        purchaseId: entitlement.id,
      },
      include: {
        purchase: true,
        unlockedEvidence: { select: { evidenceItemId: true } },
      },
    });

  return { attempt, entitlement, show: onlineShow, user };
}
