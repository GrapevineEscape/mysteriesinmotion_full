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
    secureStreamReference(show.introVideoId),
    secureStreamReference(show.actOneVideoId),
    secureStreamReference(show.intermissionVideoId),
    secureStreamReference(show.actTwoVideoId),
    secureR2Reference(show.intermissionImageUrl),
    secureR2Reference(show.resultsMusicUrl),
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
    introEnabled: show.introEnabled,
    introTitle: show.introTitle,
    introVideoId,
    actOneTitle: show.actOneTitle,
    actOneVideoId,
    accusationTimed: show.accusationTimed,
    accusationSeconds: show.accusationSeconds,
    timerWarningSeconds: show.timerWarningSeconds,
    timerExpirationAction: show.timerExpirationAction,
    intermissionTitle: show.intermissionTitle,
    intermissionMediaType: show.intermissionMediaType,
    intermissionVideoId,
    intermissionImageUrl,
    intermissionVideoLoops: show.intermissionVideoLoops,
    actTwoTitle: show.actTwoTitle,
    actTwoVideoId,
    inventoryEnabled: show.inventoryEnabled,
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
    situationRoomTitle: show.situationRoomTitle,
    situationResult,
    resultsMusicEnabled: show.resultsMusicEnabled,
    resultsMusicUrl,
    vaultTransitionEnabled: show.vaultTransitionEnabled,
    detectiveGaugeEnabled: show.detectiveGaugeEnabled,
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
