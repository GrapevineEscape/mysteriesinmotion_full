import { db } from "@/lib/db";
import type {
  SituationRank,
  SituationResult,
} from "@/lib/situation-room-types";

/**
 * Rebuilds the already-submitted Situation Room result for recovery after a
 * refresh. This is only called after authorization and submission are verified.
 */
export async function getSubmittedSituationResult(
  attemptId: string,
): Promise<SituationResult | null> {
  const attempt = await db.caseAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: {
        include: {
          question: {
            include: {
              choices: { orderBy: { displayOrder: "asc" } },
            },
          },
          selectedChoices: { include: { choice: true } },
        },
      },
      show: {
        include: {
          questions: { orderBy: { displayOrder: "asc" } },
          resultTiers: { orderBy: { minimumPercent: "asc" } },
        },
      },
    },
  });
  if (!attempt?.accusationSubmittedAt) return null;

  const answersByQuestion = new Map(
    attempt.answers.map((answer) => [answer.questionId, answer]),
  );
  const reviews = attempt.show.questions.map((question) => {
    const answer = answersByQuestion.get(question.id);
    const selectedLabels =
      answer?.selectedChoices.map((selection) => selection.choice.label) ?? [];
    const solution =
      question.type === "SHORT_TEXT"
        ? question.acceptedAnswers.join(" / ") || "No solution configured"
        : answer?.question.choices
            .filter((choice) => choice.isCorrect)
            .map((choice) => choice.label)
            .join(", ") || "No solution configured";

    return {
      id: question.id,
      question: question.prompt,
      solution,
      userAnswer:
        question.type === "SHORT_TEXT"
          ? answer?.writtenAnswer || "No answer"
          : selectedLabels.join(", ") || "No answer",
      correct: answer?.isCorrect === true,
      imageUrl: question.imageUrl,
      explanation: question.resultExplanation,
    };
  });
  const ranks: SituationRank[] = attempt.show.resultTiers.map((tier) => ({
    name: tier.name,
    minimumPercent: tier.minimumPercent,
  }));

  return {
    questions: reviews,
    ranks,
    score: attempt.score ?? 0,
    maximumScore: attempt.maximumScore ?? 0,
    scorePercent: attempt.scorePercent ?? 0,
    correctCount: reviews.filter((question) => question.correct).length,
    totalQuestions: reviews.length,
    earnedRank: attempt.resultTierName ?? "Detective",
  };
}
