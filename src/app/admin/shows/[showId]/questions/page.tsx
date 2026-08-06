import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShowNav } from "@/components/admin-show-nav";
import { QuestionBuilder } from "@/components/question-builder";
import { createQuestion, updateQuestion } from "./actions";

export default async function QuestionAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const { showId } = await params;
  const { edit } = await searchParams;
  const show = await db.show.findUnique({
    where: { slug: showId },
    include: {
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { choices: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!show) notFound();
  const questionBeingEdited = edit
    ? show.questions.find((question) => question.id === edit)
    : undefined;
  const aiGradingQuestions = show.questions.filter(
    (question) =>
      question.type === "SHORT_TEXT" &&
      question.matchMode === "AI_ASSISTED",
  );
  const aiGradingConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const aiGradingModel =
    process.env.OPENAI_GRADING_MODEL || "gpt-5.6-luna";

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">{show.title}</p>
      <h1>Questions &amp; Answers</h1>
      <p className="page-intro">
        Build the accusation form and define exactly how each answer is scored.
      </p>
      <AdminShowNav active="questions" slug={show.slug} />
      {!!aiGradingQuestions.length && (
        <div
          className={`admin-alert${aiGradingConfigured ? "" : " admin-alert-error"}`}
        >
          <strong>
            AI grading {aiGradingConfigured ? "configured" : "not configured"}
          </strong>
          <p>
            {aiGradingConfigured
              ? `${aiGradingQuestions.length} written-answer question${
                  aiGradingQuestions.length === 1 ? "" : "s"
                } will use ${aiGradingModel}. Each attempt records the grading method and reason.`
              : "OPENAI_API_KEY is missing from this web service. Written answers will use the documented fallback until the key is added."}
          </p>
        </div>
      )}
      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="card-kicker">Accusation sequence</p>
            <h2>Configured questions</h2>
          </div>
          <strong className="admin-count-badge">{show.questions.length}</strong>
        </div>
        <div className="sequence-list">
          {show.questions.map((question, index) => (
            <article
              className={questionBeingEdited?.id === question.id ? "editing" : ""}
              key={question.id}
            >
              <span className="sequence-number">{index + 1}</span>
              <div>
                <h3>{question.prompt}</h3>
                <p className="question-meta">
                  {question.type.replaceAll("_", " ")} · {question.pointValue} point
                  {question.pointValue === 1 ? "" : "s"}
                  {question.type === "SHORT_TEXT"
                    ? ` · ${question.matchMode.replaceAll("_", " ")}`
                    : ""}
                </p>
                {!!question.choices.length && (
                  <div className="configured-answer-list">
                    {question.choices.map((choice) => (
                      <span className={choice.isCorrect ? "correct" : ""} key={choice.id}>
                        {choice.isCorrect ? "✓" : "○"} {choice.label}
                      </span>
                    ))}
                  </div>
                )}
                {question.type === "SHORT_TEXT" && (
                  <div className="configured-answer-list">
                    {question.acceptedAnswers.map((answer) => (
                      <span className="correct" key={answer}>✓ {answer}</span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                className="clue-edit-link"
                href={`/admin/shows/${show.slug}/questions?edit=${question.id}`}
              >
                Edit
              </Link>
            </article>
          ))}
          {!show.questions.length && (
            <div className="admin-empty-state">
              <strong>No questions yet</strong>
              <p>Add the first accusation question below.</p>
            </div>
          )}
        </div>
      </div>
      <QuestionBuilder
        action={questionBeingEdited ? updateQuestion : createQuestion}
        initialQuestion={questionBeingEdited}
        key={questionBeingEdited?.id ?? "new"}
        showId={show.id}
        slug={show.slug}
      />
      {questionBeingEdited && (
        <Link
          className="text-link"
          href={`/admin/shows/${show.slug}/questions`}
        >
          Cancel question editing
        </Link>
      )}
      <Link className="text-link" href={`/admin/shows/${show.slug}`}>← Return to show configuration</Link>
    </section>
  );
}
