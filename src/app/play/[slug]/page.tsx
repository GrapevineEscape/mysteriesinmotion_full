import type { Metadata } from "next";
import {
  LiveCaseRoom,
  type LiveShowConfiguration,
} from "@/components/live-case-room";
import { requireCaseAccess } from "@/lib/access";
import { getSubmittedSituationResult } from "@/lib/attempt-result";
import { secureR2Reference } from "@/lib/cloudflare-r2";
import { secureStreamReference } from "@/lib/cloudflare-stream";
import type { DraftAnswers, PlayStage } from "@/lib/play-progress-types";

export const metadata: Metadata = { title: "Case Room" };

export default async function PlayCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { attempt, show, user } = await requireCaseAccess(slug);
  const online = show.online;
  const situationResult = attempt.accusationSubmittedAt
    ? await getSubmittedSituationResult(attempt.id)
    : null;
  const [
    introVideoId,
    actOneVideoId,
    intermissionVideoId,
    actTwoVideoId,
    intermissionImageUrl,
    resultsMusicUrl,
    evidence,
  ] = await Promise.all([
    secureStreamReference(online.introVideoId),
    secureStreamReference(online.actOneVideoId),
    secureStreamReference(online.intermissionVideoId),
    secureStreamReference(online.actTwoVideoId),
    secureR2Reference(online.intermissionImageUrl),
    secureR2Reference(online.resultsMusicUrl),
    Promise.all(
      show.evidenceItems.map(async (clue) => ({
        id: clue.id,
        title: clue.title,
        description: clue.description,
        fileUrl: await secureR2Reference(clue.fileUrl),
        iconUrl: await secureR2Reference(clue.iconUrl),
        unlockStage: clue.unlockStage,
        unlockAtSeconds: clue.unlockAtSeconds,
        visibleDuringReveal: clue.visibleDuringReveal,
      })),
    ),
  ]);
  const draftAnswers =
    attempt.draftAnswers &&
    typeof attempt.draftAnswers === "object" &&
    !Array.isArray(attempt.draftAnswers)
      ? (attempt.draftAnswers as DraftAnswers)
      : {};
  const configuration: LiveShowConfiguration = {
    attemptId: attempt.id,
    slug: show.slug,
    title: show.title,
    introEnabled: online.introEnabled,
    introTitle: online.introTitle,
    introVideoId,
    actOneTitle: online.actOneTitle,
    actOneVideoId,
    accusationTimed: online.accusationTimed,
    accusationSeconds: online.accusationSeconds,
    timerWarningSeconds: online.timerWarningSeconds,
    timerExpirationAction: online.timerExpirationAction,
    intermissionTitle: online.intermissionTitle,
    intermissionMediaType: online.intermissionMediaType,
    intermissionVideoId,
    intermissionImageUrl,
    intermissionVideoLoops: online.intermissionVideoLoops,
    actTwoTitle: online.actTwoTitle,
    actTwoVideoId,
    inventoryEnabled: online.inventoryEnabled,
    progress: {
      draftAnswers,
      furthestActOneSeconds: attempt.furthestActOneSeconds,
      furthestActTwoSeconds: attempt.furthestActTwoSeconds,
      furthestIntroSeconds: attempt.furthestIntroSeconds,
      intermissionStartedAt:
        attempt.intermissionStartedAt?.toISOString() ?? null,
      progressRevision: attempt.progressRevision,
      stage: attempt.playbackStage as PlayStage,
      timerExpiresAt: attempt.timerExpiresAt?.toISOString() ?? null,
      unlockedEvidenceIds: attempt.unlockedEvidence.map(
        (unlock) => unlock.evidenceItemId,
      ),
    },
    situationRoomTitle: online.situationRoomTitle,
    situationResult,
    resultsMusicEnabled: online.resultsMusicEnabled,
    resultsMusicUrl,
    vaultTransitionEnabled: online.vaultTransitionEnabled,
    detectiveGaugeEnabled: online.detectiveGaugeEnabled,
    evidence,
    questions: show.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
      })),
    })),
  };

  return (
    <LiveCaseRoom
      isAdmin={user.role === "ADMIN"}
      show={configuration}
    />
  );
}
