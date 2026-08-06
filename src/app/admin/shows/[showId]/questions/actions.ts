"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createQuestion(formData: FormData) {
  await requireAdmin();
  const showId = String(formData.get("showId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const type =
    formData.get("type") === "MULTIPLE_CHOICE"
      ? "MULTIPLE_CHOICE"
      : formData.get("type") === "SHORT_TEXT"
        ? "SHORT_TEXT"
        : "SINGLE_CHOICE";
  if (!showId || !prompt) throw new Error("Show and question are required.");
  const count = await db.question.count({ where: { showId } });
  const acceptedAnswers = String(formData.get("acceptedAnswers") ?? "")
    .split("\n").map((value) => value.trim()).filter(Boolean);
  const choiceLabels = formData
    .getAll("choiceLabel")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const correctChoiceIndexes = new Set(
    formData.getAll("correctChoice").map((value) => Number(value)),
  );

  if (type !== "SHORT_TEXT" && choiceLabels.length < 2) {
    throw new Error("Choice questions require at least two answers.");
  }
  if (type !== "SHORT_TEXT" && correctChoiceIndexes.size === 0) {
    throw new Error("Select at least one correct answer.");
  }

  await db.question.create({
    data: {
      showId,
      prompt,
      type,
      pointValue: Math.max(1, Number(formData.get("pointValue")) || 1),
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
      matchMode:
        formData.get("matchMode") === "AI_ASSISTED"
          ? "AI_ASSISTED"
          : formData.get("matchMode") === "NORMALIZED"
            ? "NORMALIZED"
            : "EXACT",
      acceptedAnswers,
      aiGradingRubric: String(formData.get("aiGradingRubric") ?? "").trim() || null,
      resultExplanation: String(formData.get("resultExplanation") ?? "").trim() || null,
      displayOrder: count,
      choices: {
        create: type === "SHORT_TEXT" ? [] : choiceLabels.map((label, index) => ({
          label,
          isCorrect: correctChoiceIndexes.has(index),
          displayOrder: index,
        })),
      },
    },
  });
  revalidatePath(`/admin/shows/${String(formData.get("slug") ?? "")}/questions`);
}

export async function updateQuestion(formData: FormData) {
  await requireAdmin();
  const questionId = String(formData.get("questionId") ?? "");
  const showId = String(formData.get("showId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const type =
    formData.get("type") === "MULTIPLE_CHOICE"
      ? "MULTIPLE_CHOICE"
      : formData.get("type") === "SHORT_TEXT"
        ? "SHORT_TEXT"
        : "SINGLE_CHOICE";
  if (!questionId || !showId || !prompt) {
    throw new Error("Show, question, and question text are required.");
  }

  const existing = await db.question.findFirst({
    where: { id: questionId, showId },
    include: { _count: { select: { answers: true } } },
  });
  if (!existing) throw new Error("The selected question could not be found.");
  if (existing._count.answers > 0) {
    throw new Error(
      "This question already has player answers and can no longer be edited.",
    );
  }

  const acceptedAnswers = String(formData.get("acceptedAnswers") ?? "")
    .split("\n").map((value) => value.trim()).filter(Boolean);
  const choiceLabels = formData
    .getAll("choiceLabel")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const correctChoiceIndexes = new Set(
    formData.getAll("correctChoice").map((value) => Number(value)),
  );
  if (type !== "SHORT_TEXT" && choiceLabels.length < 2) {
    throw new Error("Choice questions require at least two answers.");
  }
  if (type !== "SHORT_TEXT" && correctChoiceIndexes.size === 0) {
    throw new Error("Select at least one correct answer.");
  }

  await db.$transaction(async (transaction) => {
    await transaction.answerChoice.deleteMany({ where: { questionId } });
    await transaction.question.update({
      where: { id: questionId },
      data: {
        prompt,
        type,
        pointValue: Math.max(1, Number(formData.get("pointValue")) || 1),
        imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
        matchMode:
          formData.get("matchMode") === "AI_ASSISTED"
            ? "AI_ASSISTED"
            : formData.get("matchMode") === "NORMALIZED"
              ? "NORMALIZED"
              : "EXACT",
        acceptedAnswers,
        aiGradingRubric:
          String(formData.get("aiGradingRubric") ?? "").trim() || null,
        resultExplanation:
          String(formData.get("resultExplanation") ?? "").trim() || null,
        choices: {
          create:
            type === "SHORT_TEXT"
              ? []
              : choiceLabels.map((label, index) => ({
                  label,
                  isCorrect: correctChoiceIndexes.has(index),
                  displayOrder: index,
                })),
        },
      },
    });
  });

  revalidatePath(`/admin/shows/${String(formData.get("slug") ?? "")}/questions`);
}
