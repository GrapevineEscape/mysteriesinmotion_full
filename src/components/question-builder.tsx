"use client";

import { useState } from "react";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT";

const DEFAULT_AI_GRADING_RUBRIC =
  "Accept concise paraphrases that preserve the essential meaning of an accepted answer. Reject contradictory, unrelated, or too-vague responses.";

const questionTypes: Array<{
  id: QuestionType;
  title: string;
  description: string;
}> = [
  {
    id: "SINGLE_CHOICE",
    title: "Select one",
    description: "Players choose exactly one answer.",
  },
  {
    id: "MULTIPLE_CHOICE",
    title: "Select multiple",
    description: "Players may choose more than one answer.",
  },
  {
    id: "SHORT_TEXT",
    title: "Fill in the blank",
    description: "Players type a short written response.",
  },
];

export function QuestionBuilder({
  action,
  initialQuestion,
  showId,
  slug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialQuestion?: {
    acceptedAnswers: string[];
    aiGradingRubric: string | null;
    choices: Array<{ label: string; isCorrect: boolean }>;
    id: string;
    imageUrl: string | null;
    matchMode: "EXACT" | "NORMALIZED" | "AI_ASSISTED";
    pointValue: number;
    prompt: string;
    resultExplanation: string | null;
    type: QuestionType;
  };
  showId: string;
  slug: string;
}) {
  const [type, setType] = useState<QuestionType>(
    initialQuestion?.type ?? "SINGLE_CHOICE",
  );
  const [choices, setChoices] = useState(
    initialQuestion?.choices.length
      ? initialQuestion.choices.map((choice) => choice.label)
      : ["", ""],
  );
  const isEditing = Boolean(initialQuestion);

  function updateChoice(index: number, value: string) {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? value : choice,
      ),
    );
  }

  function removeChoice(index: number) {
    setChoices((current) => current.filter((_, choiceIndex) => choiceIndex !== index));
  }

  return (
    <form action={action} className="admin-panel question-builder">
      <input name="showId" type="hidden" value={showId} />
      <input name="slug" type="hidden" value={slug} />
      {initialQuestion && (
        <input name="questionId" type="hidden" value={initialQuestion.id} />
      )}

      <div className="admin-panel-heading">
        <div>
          <p className="card-kicker">
            {isEditing ? "Editing saved question" : "Question builder"}
          </p>
          <h2>{isEditing ? "Edit question" : "Add a question"}</h2>
          <p>Choose how players answer, then identify the correct solution.</p>
        </div>
      </div>

      <div className="form-section">
        <label className="admin-field">
          <span>Question shown to players</span>
          <input
            name="prompt"
            placeholder="Example: Who framed Max?"
            required
            defaultValue={initialQuestion?.prompt ?? ""}
          />
        </label>
      </div>

      <fieldset className="question-format-picker">
        <legend>How should players answer?</legend>
        <div>
          {questionTypes.map((questionType) => (
            <label key={questionType.id}>
              <input
                checked={type === questionType.id}
                name="type"
                onChange={() => setType(questionType.id)}
                type="radio"
                value={questionType.id}
              />
              <span className="format-icon" aria-hidden="true">
                {questionType.id === "SINGLE_CHOICE"
                  ? "●"
                  : questionType.id === "MULTIPLE_CHOICE"
                    ? "✓✓"
                    : "Aa"}
              </span>
              <strong>{questionType.title}</strong>
              <small>{questionType.description}</small>
            </label>
          ))}
        </div>
      </fieldset>

      {type !== "SHORT_TEXT" ? (
        <fieldset className="answer-choice-builder">
          <legend>
            Answer choices
            <small>
              {type === "SINGLE_CHOICE"
                ? " Select the one correct answer."
                : " Select every correct answer."}
            </small>
          </legend>
          <div className="answer-choice-list">
            {choices.map((choice, index) => (
              <div className="answer-choice-row" key={index}>
                <label className="correct-answer-toggle">
                  <input
                    defaultChecked={
                      initialQuestion?.choices[index]?.isCorrect ?? false
                    }
                    name="correctChoice"
                    required={type === "SINGLE_CHOICE"}
                    type={type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                    value={index}
                  />
                  <span aria-hidden="true" />
                  <em>Correct</em>
                </label>
                <input
                  aria-label={`Answer choice ${index + 1}`}
                  name="choiceLabel"
                  onChange={(event) => updateChoice(index, event.target.value)}
                  placeholder={`Answer choice ${index + 1}`}
                  required
                  value={choice}
                />
                <button
                  aria-label={`Remove answer choice ${index + 1}`}
                  disabled={choices.length <= 2}
                  onClick={() => removeChoice(index)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="add-choice-button"
            onClick={() => setChoices((current) => [...current, ""])}
            type="button"
          >
            + Add another answer
          </button>
        </fieldset>
      ) : (
        <div className="form-section">
          <label className="admin-field">
            <span>Accepted written answers</span>
            <small>
              Enter one acceptable answer per line. AI-assisted grading accepts
              concise paraphrases while still rejecting vague answers.
            </small>
            <textarea
              defaultValue={initialQuestion?.acceptedAnswers.join("\n") ?? ""}
              name="acceptedAnswers"
              required
              rows={4}
            />
          </label>
          <label className="admin-field">
            <span>Written-answer matching</span>
            <select
              defaultValue={initialQuestion?.matchMode ?? "AI_ASSISTED"}
              name="matchMode"
            >
              <option value="EXACT">Exact match</option>
              <option value="NORMALIZED">Ignore capitalization and punctuation</option>
              <option value="AI_ASSISTED">AI-assisted interpretation</option>
            </select>
          </label>
          <label className="admin-field">
            <span>AI grading guidance</span>
            <textarea
              name="aiGradingRubric"
              placeholder="Explain what meaning must be present for the answer to count."
              rows={3}
              defaultValue={
                initialQuestion?.aiGradingRubric ?? DEFAULT_AI_GRADING_RUBRIC
              }
            />
          </label>
        </div>
      )}

      <div className="question-options-grid">
        <label className="admin-field">
          <span>Points</span>
          <input
            defaultValue={initialQuestion?.pointValue ?? 1}
            min="1"
            name="pointValue"
            type="number"
          />
        </label>
        <label className="admin-field">
          <span>Optional review picture URL</span>
          <input
            defaultValue={initialQuestion?.imageUrl ?? ""}
            name="imageUrl"
            placeholder="https://…"
            type="url"
          />
        </label>
        <label className="admin-field wide-field">
          <span>Situation Room explanation</span>
          <textarea
            name="resultExplanation"
            placeholder="Optional explanation displayed after the solution is revealed."
            rows={3}
            defaultValue={initialQuestion?.resultExplanation ?? ""}
          />
        </label>
      </div>

      <div className="admin-form-footer">
        <p>
          {isEditing
            ? "Saving updates this question in place."
            : "The question will appear after the existing questions."}
        </p>
        <button className="button button-primary" type="submit">
          {isEditing ? "Save changes" : "Save question"}
        </button>
      </div>
    </form>
  );
}
