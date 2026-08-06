import type { Prisma } from "@prisma/client";

export type ReadinessState = "READY" | "BLOCKED" | "VERIFY";

export type ReadinessItem = {
  label: string;
  detail: string;
  state: ReadinessState;
};

export type ShowReadiness = {
  items: ReadinessItem[];
  blockers: ReadinessItem[];
  checks: ReadinessItem[];
  readyToPublish: boolean;
};

export const showReadinessInclude = {
  questions: {
    orderBy: { displayOrder: "asc" },
    include: { choices: { orderBy: { displayOrder: "asc" } } },
  },
  evidenceItems: { orderBy: { displayOrder: "asc" } },
} satisfies Prisma.ShowInclude;

export type ReadinessShow = Prisma.ShowGetPayload<{
  include: typeof showReadinessInclude;
}>;

function isWebUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isStoredFileReference(value: string | null | undefined) {
  if (!value) return false;
  if (/^r2:\/\/[^/]+\/.+/i.test(value)) return true;
  return isWebUrl(value);
}

function item(
  label: string,
  state: ReadinessState,
  detail: string,
): ReadinessItem {
  return { label, state, detail };
}

/**
 * Runs deterministic checks that can be completed from saved show data.
 * Video duration checks remain manual because Cloudflare duration metadata is
 * not stored in PostgreSQL.
 */
export function evaluateShowReadiness(show: ReadinessShow): ShowReadiness {
  const items: ReadinessItem[] = [];

  items.push(
    show.priceCents === 1000 && show.currency.toLowerCase() === "usd"
      ? item("Price", "READY", "$10.00 USD is configured.")
      : item("Price", "BLOCKED", "Every online mystery must be $10.00 USD."),
  );

  items.push(
    show.actOneVideoId
      ? item("Act One video", "READY", "A required Act One video is configured.")
      : item("Act One video", "BLOCKED", "Add the required Act One video."),
  );
  items.push(
    show.actTwoVideoId
      ? item("Act Two video", "READY", "A required Act Two video is configured.")
      : item("Act Two video", "BLOCKED", "Add the required Act Two/reveal video."),
  );

  if (show.introEnabled) {
    items.push(
      show.introVideoId
        ? item("Introduction", "READY", "The enabled introduction has a video.")
        : item(
            "Introduction",
            "BLOCKED",
            "Introduction is enabled, but no video is configured.",
          ),
    );
  } else {
    items.push(item("Introduction", "READY", "Optional introduction is disabled."));
  }

  const intermissionErrors: string[] = [];
  if (!show.intermissionTitle.trim()) {
    intermissionErrors.push("add a displayed title");
  }
  if (show.intermissionMediaType === "VIDEO" && !show.intermissionVideoId) {
    intermissionErrors.push("add the selected intermission video");
  }
  if (
    show.intermissionMediaType === "IMAGE" &&
    !isStoredFileReference(show.intermissionImageUrl)
  ) {
    intermissionErrors.push("add a valid intermission image URL");
  }
  if (show.accusationTimed) {
    if (!show.accusationSeconds || show.accusationSeconds < 1) {
      intermissionErrors.push("add a positive accusation time limit");
    }
    if (
      show.timerWarningSeconds &&
      show.accusationSeconds &&
      show.timerWarningSeconds >= show.accusationSeconds
    ) {
      intermissionErrors.push("set the warning earlier than timer expiration");
    }
  }
  items.push(
    intermissionErrors.length
      ? item(
          "Intermission",
          "BLOCKED",
          `Intermission is incomplete: ${intermissionErrors.join("; ")}.`,
        )
      : item(
          "Intermission",
          "READY",
          show.accusationTimed
            ? "Required decision stage and countdown settings are valid."
            : "Required untimed decision stage is configured.",
        ),
  );

  if (!show.questions.length) {
    items.push(
      item(
        "Questions and answers",
        "BLOCKED",
        "Add at least one accusation question.",
      ),
    );
  } else {
    const invalidQuestions: string[] = [];
    for (const [index, question] of show.questions.entries()) {
      const name = `Question ${index + 1}`;
      if (question.type === "SHORT_TEXT") {
        if (!question.acceptedAnswers.length) {
          invalidQuestions.push(`${name} needs an accepted answer`);
        }
        if (
          question.matchMode === "AI_ASSISTED" &&
          !question.aiGradingRubric?.trim()
        ) {
          invalidQuestions.push(`${name} needs an AI grading rubric`);
        }
      } else {
        const correctCount = question.choices.filter(
          (choice) => choice.isCorrect,
        ).length;
        if (question.choices.length < 2) {
          invalidQuestions.push(`${name} needs at least two choices`);
        }
        if (correctCount === 0) {
          invalidQuestions.push(`${name} needs a correct choice`);
        }
        if (question.type === "SINGLE_CHOICE" && correctCount !== 1) {
          invalidQuestions.push(`${name} must have exactly one correct choice`);
        }
      }
    }
    items.push(
      invalidQuestions.length
        ? item(
            "Questions and answers",
            "BLOCKED",
            invalidQuestions.join("; ") + ".",
          )
        : item(
            "Questions and answers",
            "READY",
            `${show.questions.length} scored ${
              show.questions.length === 1 ? "question is" : "questions are"
            } ready.`,
          ),
    );
  }

  if (!show.evidenceItems.length) {
    items.push(
      show.inventoryEnabled
        ? item(
            "Case Inventory",
            "BLOCKED",
            "Inventory is enabled, but no clues are configured.",
          )
        : item("Case Inventory", "READY", "This show has no inventory clues."),
    );
  } else {
    const clueErrors: string[] = [];
    for (const [index, clue] of show.evidenceItems.entries()) {
      const name = `Clue ${index + 1} (${clue.title})`;
      if (!isStoredFileReference(clue.fileUrl)) {
        clueErrors.push(`${name} needs a valid file reference`);
      }
      if (!isStoredFileReference(clue.iconUrl)) {
        clueErrors.push(`${name} needs a valid icon reference`);
      }
      if (clue.unlockAtSeconds < 0) {
        clueErrors.push(`${name} has an invalid unlock time`);
      }
    }
    if (!show.inventoryEnabled) {
      clueErrors.push("enable Case Inventory because clues are configured");
    }
    items.push(
      clueErrors.length
        ? item("Case Inventory", "BLOCKED", clueErrors.join("; ") + ".")
        : item(
            "Case Inventory",
            "READY",
            `${show.evidenceItems.length} ${
              show.evidenceItems.length === 1 ? "clue has" : "clues have"
            } a file, icon, act, and valid time code.`,
          ),
    );
    items.push(
      item(
        "Clue timing preview",
        "VERIFY",
        "Preview both acts and confirm every clue unlocks before its video ends.",
      ),
    );
  }

  if (show.resultsMusicEnabled) {
    items.push(
      isStoredFileReference(show.resultsMusicUrl)
        ? item(
            "Situation Room music",
            "READY",
            "Enabled results music has a valid URL.",
          )
        : item(
            "Situation Room music",
            "BLOCKED",
            "Results music is enabled, but its URL is missing or invalid.",
          ),
    );
  } else {
    items.push(
      item("Situation Room music", "READY", "Optional results music is disabled."),
    );
  }

  items.push(
    item(
      "Customer preview",
      "VERIFY",
      "Complete a customer preview on desktop and mobile before launch.",
    ),
  );

  const blockers = items.filter((check) => check.state === "BLOCKED");
  const checks = items.filter((check) => check.state === "VERIFY");
  return {
    items,
    blockers,
    checks,
    readyToPublish: blockers.length === 0,
  };
}
