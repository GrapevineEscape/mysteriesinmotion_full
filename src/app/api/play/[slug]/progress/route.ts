import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSubmittedSituationResult } from "@/lib/attempt-result";
import { db } from "@/lib/db";
import {
  canStartNewGame,
  entitlementWindowEnd,
  gameCanContinue,
} from "@/lib/entitlements";
import type {
  DraftAnswers,
  PlayProgressResponse,
  PlayStage,
} from "@/lib/play-progress-types";

const PLAY_STAGES = new Set<PlayStage>([
  "NOT_STARTED",
  "INTRO",
  "ACT_ONE",
  "INTERMISSION",
  "ACCUSATION_SUBMITTED",
  "COUNTDOWN",
  "ACT_TWO",
  "SITUATION_ROOM",
  "COMPLETED",
]);

function playStage(value: string): PlayStage {
  return PLAY_STAGES.has(value as PlayStage)
    ? (value as PlayStage)
    : "NOT_STARTED";
}

function canMoveToStage(
  current: PlayStage,
  next: PlayStage,
  accusationSubmitted: boolean,
  isAdmin: boolean,
) {
  if (next === current) return true;
  if (isAdmin && next !== "COMPLETED") return true;
  if (accusationSubmitted) {
    return ["ACCUSATION_SUBMITTED", "COUNTDOWN", "ACT_TWO", "SITUATION_ROOM"].includes(
      next,
    );
  }

  const allowed: Record<PlayStage, PlayStage[]> = {
    NOT_STARTED: ["INTRO", "ACT_ONE"],
    INTRO: ["ACT_ONE"],
    ACT_ONE: ["INTERMISSION"],
    INTERMISSION: [],
    ACCUSATION_SUBMITTED: [],
    COUNTDOWN: [],
    ACT_TWO: [],
    SITUATION_ROOM: [],
    COMPLETED: [],
  };
  return allowed[current].includes(next);
}

async function authorizedAttempt(slug: string, attemptId: string) {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again.", status: 401 } as const;

  const show = await db.show.findUnique({
    where: { slug },
    include: {
      online: true,
      evidenceItems: true,
      questions: { include: { choices: true } },
    },
  });
  if (!show) return { error: "Mystery not found.", status: 404 } as const;

  // Only online productions have playable progress. Rebuilding the object
  // carries the non-null narrowing through to the caller.
  const { online, ...showBase } = show;
  if (!online) {
    return { error: "Mystery not found.", status: 404 } as const;
  }
  const onlineShow = { ...showBase, online };

  const attempt = await db.caseAttempt.findFirst({
    where: { id: attemptId, userId: user.id, showId: show.id },
    include: {
      purchase: true,
      unlockedEvidence: { select: { evidenceItemId: true } },
    },
  });
  if (!attempt) {
    return { error: "This playthrough was not found.", status: 404 } as const;
  }
  if (
    user.role !== "ADMIN" &&
    !gameCanContinue(attempt) &&
    !(attempt.purchase && canStartNewGame(attempt.purchase))
  ) {
    return {
      error:
        "This access window has ended. Purchase the mystery again to start a new game.",
      status: 403,
    } as const;
  }
  return { attempt, show: onlineShow, user } as const;
}

function sanitizeDraftAnswers(
  value: unknown,
  questions: Array<{
    id: string;
    type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT";
    choices: Array<{ id: string }>;
  }>,
): DraftAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const submitted = value as Record<string, unknown>;
  const sanitized: DraftAnswers = {};

  for (const question of questions) {
    const answer = submitted[question.id];
    if (question.type === "SHORT_TEXT") {
      if (typeof answer === "string") {
        sanitized[question.id] = answer.slice(0, 5_000);
      }
      continue;
    }

    const validIds = new Set(question.choices.map((choice) => choice.id));
    const selections = (
      Array.isArray(answer) ? answer : typeof answer === "string" ? [answer] : []
    )
      .filter((selection): selection is string => typeof selection === "string")
      .filter((selection) => validIds.has(selection));
    sanitized[question.id] =
      question.type === "MULTIPLE_CHOICE" ? [...new Set(selections)] : selections[0] ?? "";
  }
  return sanitized;
}

function responseFromAttempt(
  attempt: {
    draftAnswers: unknown;
    furthestActOneSeconds: number;
    furthestActTwoSeconds: number;
    furthestIntroSeconds: number;
    intermissionStartedAt: Date | null;
    playbackStage: string;
    progressRevision: number;
    timerExpiresAt: Date | null;
    unlockedEvidence: Array<{ evidenceItemId: string }>;
  },
): PlayProgressResponse {
  return {
    draftAnswers:
      attempt.draftAnswers &&
      typeof attempt.draftAnswers === "object" &&
      !Array.isArray(attempt.draftAnswers)
        ? (attempt.draftAnswers as DraftAnswers)
        : {},
    furthestActOneSeconds: attempt.furthestActOneSeconds,
    furthestActTwoSeconds: attempt.furthestActTwoSeconds,
    furthestIntroSeconds: attempt.furthestIntroSeconds,
    intermissionStartedAt: attempt.intermissionStartedAt?.toISOString() ?? null,
    progressRevision: attempt.progressRevision,
    stage: playStage(attempt.playbackStage),
    timerExpiresAt: attempt.timerExpiresAt?.toISOString() ?? null,
    unlockedEvidenceIds: attempt.unlockedEvidence.map(
      (unlock) => unlock.evidenceItemId,
    ),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const attemptId = new URL(request.url).searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json(
      { error: "This playthrough could not be identified." },
      { status: 400 },
    );
  }
  const { slug } = await params;
  const access = await authorizedAttempt(slug, attemptId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const result = responseFromAttempt(access.attempt);
  if (access.attempt.accusationSubmittedAt) {
    result.situationResult = await getSubmittedSituationResult(attemptId);
  }
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  let body: {
    attemptId?: string;
    draftAnswers?: unknown;
    enterIntermission?: boolean;
    playbackSeconds?: number;
    progressRevision?: number;
    stage?: string;
    startedPlayback?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid progress update." }, { status: 400 });
  }
  if (!body.attemptId) {
    return NextResponse.json(
      { error: "This playthrough could not be identified." },
      { status: 400 },
    );
  }

  const { slug } = await params;
  const access = await authorizedAttempt(slug, body.attemptId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { attempt, show, user } = access;
  const currentStage = playStage(attempt.playbackStage);
  const requestedStage = PLAY_STAGES.has(body.stage as PlayStage)
    ? (body.stage as PlayStage)
    : currentStage;
  if (
    !canMoveToStage(
      currentStage,
      requestedStage,
      Boolean(attempt.accusationSubmittedAt),
      user.role === "ADMIN",
    )
  ) {
    return NextResponse.json(
      { error: "That playback transition is not available." },
      { status: 409 },
    );
  }

  const now = new Date();
  const beginsCustomerStreaming =
    user.role !== "ADMIN" &&
    !attempt.investigationStartedAt &&
    (body.startedPlayback ||
      (typeof body.playbackSeconds === "number" &&
        body.playbackSeconds > 0)) &&
    ["INTRO", "ACT_ONE"].includes(requestedStage);
  const update: {
    draftAnswers?: DraftAnswers;
    furthestActOneSeconds?: number;
    furthestActTwoSeconds?: number;
    furthestIntroSeconds?: number;
    intermissionStartedAt?: Date;
    investigationStartedAt?: Date;
    playbackStage?: PlayStage;
    playbackUpdatedAt?: Date;
    progressRevision?: number;
    revealStartedAt?: Date;
    status?:
      | "NOT_STARTED"
      | "INVESTIGATING"
      | "READY_TO_ACCUSE"
      | "ACCUSATION_SUBMITTED"
      | "REVEAL_AVAILABLE"
      | "COMPLETED";
    timerExpiresAt?: Date;
  } = { playbackStage: requestedStage };
  const requestedRevision =
    typeof body.progressRevision === "number" &&
    Number.isInteger(body.progressRevision) &&
    body.progressRevision > 0
      ? body.progressRevision
      : attempt.progressRevision + 1;
  update.progressRevision = requestedRevision;

  if (body.draftAnswers !== undefined && !attempt.accusationSubmittedAt) {
    update.draftAnswers = sanitizeDraftAnswers(body.draftAnswers, show.questions);
  }

  if (
    body.enterIntermission &&
    requestedStage === "INTERMISSION" &&
    !attempt.accusationSubmittedAt
  ) {
    update.intermissionStartedAt = attempt.intermissionStartedAt ?? now;
    update.status = "READY_TO_ACCUSE";
    const online = show.online;
    if (
      online.accusationTimed &&
      online.accusationSeconds &&
      online.accusationSeconds > 0 &&
      !attempt.timerExpiresAt
    ) {
      update.timerExpiresAt = new Date(
        now.getTime() + online.accusationSeconds * 1_000,
      );
    }
  }

  if (
    (body.startedPlayback ||
      (typeof body.playbackSeconds === "number" &&
        body.playbackSeconds > 0)) &&
    ["INTRO", "ACT_ONE", "ACT_TWO"].includes(requestedStage)
  ) {
    if (requestedStage === "ACT_TWO") {
      update.revealStartedAt = attempt.revealStartedAt ?? now;
      update.status = "REVEAL_AVAILABLE";
    } else {
      update.investigationStartedAt = attempt.investigationStartedAt ?? now;
      update.status = "INVESTIGATING";
    }
  }

  const playbackField =
    requestedStage === "INTRO"
      ? "furthestIntroSeconds"
      : requestedStage === "ACT_ONE"
        ? "furthestActOneSeconds"
        : requestedStage === "ACT_TWO"
          ? "furthestActTwoSeconds"
          : null;
  if (
    playbackField &&
    typeof body.playbackSeconds === "number" &&
    Number.isFinite(body.playbackSeconds)
  ) {
    const reported = Math.max(0, Math.floor(body.playbackSeconds));
    const existing = attempt[playbackField];
    const elapsed = Math.max(
      0,
      (now.getTime() -
        (attempt.playbackUpdatedAt ?? attempt.investigationStartedAt ?? attempt.createdAt).getTime()) /
        1_000,
    );
    const allowed =
      user.role === "ADMIN"
        ? reported
        : Math.min(reported, existing + Math.max(12, Math.ceil(elapsed) + 5));
    update[playbackField] = Math.max(existing, allowed);
    update.playbackUpdatedAt = now;
  }

  const transactionResult = await db.$transaction(async (transaction) => {
    if (beginsCustomerStreaming && !attempt.purchase?.playWindowStartedAt) {
      if (!attempt.purchaseId) return "expired" as const;
      const activated = await transaction.purchase.updateMany({
        where: {
          id: attempt.purchaseId,
          status: { in: ["PAID", "COMPLIMENTARY"] },
          playWindowStartedAt: null,
          startByAt: { gt: now },
        },
        data: {
          playWindowStartedAt: now,
          playWindowEndsAt: entitlementWindowEnd(now),
        },
      });
      if (activated.count !== 1) return "expired" as const;
    }

    const updated = await transaction.caseAttempt.updateMany({
      where: {
        id: attempt.id,
        progressRevision: { lt: requestedRevision },
        accusationSubmittedAt: attempt.accusationSubmittedAt
          ? { not: null }
          : null,
      },
      data: update,
    });
    if (updated.count !== 1) return "stale" as const;
    const saved = await transaction.caseAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    const actOneSeconds =
      update.furthestActOneSeconds ?? saved.furthestActOneSeconds;
    const actTwoSeconds =
      update.furthestActTwoSeconds ?? saved.furthestActTwoSeconds;
    const eligibleEvidence = show.evidenceItems.filter(
      (item) =>
        (item.unlockStage === "ACT_ONE" &&
          item.unlockAtSeconds <= actOneSeconds) ||
        (item.unlockStage === "ACT_TWO" &&
          item.unlockAtSeconds <= actTwoSeconds),
    );
    for (const item of eligibleEvidence) {
      await transaction.evidenceUnlock.upsert({
        where: {
          attemptId_evidenceItemId: {
            attemptId: attempt.id,
            evidenceItemId: item.id,
          },
        },
        update: {},
        create: { attemptId: attempt.id, evidenceItemId: item.id },
      });
    }
    return "saved" as const;
  });
  if (transactionResult === "expired") {
    return NextResponse.json(
      {
        error:
          "This access window has ended. Purchase the mystery again to start a new game.",
      },
      { status: 403 },
    );
  }

  const savedAttempt = await db.caseAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
    include: {
      unlockedEvidence: { select: { evidenceItemId: true } },
    },
  });
  return NextResponse.json(responseFromAttempt(savedAttempt));
}
