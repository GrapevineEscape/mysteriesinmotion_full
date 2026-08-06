import Link from "next/link";
import { db } from "@/lib/db";
import { canStartNewGame, gameCanContinue } from "@/lib/entitlements";
import {
  grantComplimentaryAccess,
  resendLoginCode,
  resetActiveAttempt,
  updateAccessState,
} from "./actions";

const adminDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

function streamedLabel(attempt: {
  investigationStartedAt: Date | null;
  furthestIntroSeconds: number;
  furthestActOneSeconds: number;
  furthestActTwoSeconds: number;
  accusationSubmittedAt: Date | null;
}) {
  return Boolean(
    attempt.investigationStartedAt ||
      attempt.furthestIntroSeconds > 0 ||
      attempt.furthestActOneSeconds > 0 ||
      attempt.furthestActTwoSeconds > 0 ||
      attempt.accusationSubmittedAt,
  );
}

export default async function CustomerSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const { q: rawQuery, notice } = await searchParams;
  const query = rawQuery?.trim().toLowerCase() ?? "";
  const users = await db.user.findMany({
    where: query
      ? { email: { contains: query, mode: "insensitive" } }
      : { role: "CUSTOMER" },
    take: 20,
    orderBy: { updatedAt: "desc" },
    include: {
      purchases: {
        orderBy: { updatedAt: "desc" },
        include: { show: true },
      },
      attempts: {
        orderBy: { createdAt: "desc" },
        include: {
          purchase: true,
          show: { select: { title: true, slug: true } },
          answers: {
            where: { isCorrect: false },
            include: { question: { select: { prompt: true } } },
          },
        },
      },
    },
  });
  const shows = await db.show.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, title: true },
  });

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">Administrator</p>
      <h1>Customer Support</h1>
      <p className="page-intro">
        Find an account, review access and play history, grant complimentary
        mysteries, and recover an unfinished investigation.
      </p>
      <div className="admin-top-actions">
        <Link className="button button-ghost" href="/admin">
          ← Show Administration
        </Link>
      </div>

      <form className="customer-search" method="get">
        <label htmlFor="customer-email">Customer email</label>
        <div>
          <input
            defaultValue={query}
            id="customer-email"
            name="q"
            placeholder="customer@example.com"
            type="search"
          />
          <button className="button button-primary" type="submit">
            Find account
          </button>
        </div>
      </form>

      {notice && (
        <div className="admin-alert" role="status">
          <strong>Support update</strong>
          <span>{notice}</span>
        </div>
      )}

      {!users.length && (
        <div className="admin-empty-state customer-empty">
          <strong>No matching account</strong>
          <p>Check the complete email address and try again.</p>
        </div>
      )}

      <div className="customer-results">
        {users.map((user) => {
          const activeAttempts = user.attempts.filter(
            (attempt) => !attempt.completedAt,
          );
          const completedAttempts = user.attempts.filter(
            (attempt) => attempt.completedAt,
          );
          const currentAccessShowIds = new Set(
            [
              ...user.purchases
                .filter((purchase) => canStartNewGame(purchase))
                .map((purchase) => purchase.showId),
              ...activeAttempts
                .filter((attempt) => gameCanContinue(attempt))
                .map((attempt) => attempt.showId),
            ],
          );

          return (
            <article className="customer-support-card" key={user.id}>
              <header>
                <div>
                  <p className="card-kicker">{user.role}</p>
                  <h2>{user.email}</h2>
                  <span>
                    Created {adminDate.format(user.createdAt)}
                    {user.emailVerifiedAt
                      ? ` · verified ${adminDate.format(user.emailVerifiedAt)}`
                      : " · email not verified"}
                  </span>
                </div>
                <form action={resendLoginCode}>
                  <input name="email" type="hidden" value={user.email} />
                  <button className="button button-ghost" type="submit">
                    Send new login code
                  </button>
                </form>
              </header>

              <section className="customer-support-section">
                <div className="admin-panel-heading">
                  <div>
                    <p className="card-kicker">Entitlements</p>
                    <h3>Purchases and access</h3>
                  </div>
                  <strong className="admin-count-badge">
                    {user.purchases.length}
                  </strong>
                </div>

                <div className="support-access-list">
                  {user.purchases.map((purchase) => {
                    const showAttempts = user.attempts.filter(
                      (attempt) => attempt.purchaseId === purchase.id,
                    );
                    const hasStreamingEvidence =
                      Boolean(purchase.playWindowStartedAt) ||
                      showAttempts.some(streamedLabel);
                    return (
                      <article key={purchase.id}>
                        <div>
                          <h4>{purchase.show.title}</h4>
                          <p>
                            <span
                              className={`support-state ${purchase.status.toLowerCase()}`}
                            >
                              {purchase.status}
                            </span>
                            {purchase.amountCents > 0
                              ? ` · $${(purchase.amountCents / 100).toFixed(2)}`
                              : " · Complimentary"}
                            {purchase.purchasedAt
                              ? ` · ${adminDate.format(purchase.purchasedAt)}`
                              : ""}
                          </p>
                          <small>
                            {purchase.playWindowStartedAt &&
                            purchase.playWindowEndsAt
                              ? `48-hour replay window: ${adminDate.format(
                                  purchase.playWindowStartedAt,
                                )}–${adminDate.format(
                                  purchase.playWindowEndsAt,
                                )}`
                              : purchase.startByAt
                                ? `Must begin by ${adminDate.format(
                                    purchase.startByAt,
                                  )}`
                                : "No access deadline recorded"}
                          </small>
                          <small>
                            {hasStreamingEvidence
                              ? "Gameplay records show streaming began; refund status is blocked."
                              : "No saved evidence of streaming. Refund status is eligible for review."}
                          </small>
                        </div>
                        <form action={updateAccessState}>
                          <input name="purchaseId" type="hidden" value={purchase.id} />
                          <input name="email" type="hidden" value={user.email} />
                          <label>
                            <span>Access state</span>
                            <select defaultValue="" name="status" required>
                              <option disabled value="">
                                Choose action…
                              </option>
                              <option value="RESTORE">
                                Restore {purchase.amountCents > 0 ? "paid" : "complimentary"} access
                              </option>
                              <option value="PENDING">Pending / remove access</option>
                              <option value="DISPUTED">
                                Suspended / revoke access
                              </option>
                              <option value="REFUNDED">
                                Refunded / remove access
                              </option>
                            </select>
                          </label>
                          <button className="button button-ghost" type="submit">
                            Update
                          </button>
                        </form>
                      </article>
                    );
                  })}
                  {!user.purchases.length && (
                    <p>No purchase or complimentary-access records.</p>
                  )}
                </div>

                <div className="complimentary-grants">
                  <strong>Grant complimentary access</strong>
                  <div>
                    {shows
                      .filter((show) => !currentAccessShowIds.has(show.id))
                      .map((show) => (
                        <form action={grantComplimentaryAccess} key={show.id}>
                          <input name="userId" type="hidden" value={user.id} />
                          <input name="showId" type="hidden" value={show.id} />
                          <input name="email" type="hidden" value={user.email} />
                          <button className="button button-ghost" type="submit">
                            + {show.title}
                          </button>
                        </form>
                      ))}
                    {shows.every((show) =>
                      currentAccessShowIds.has(show.id),
                    ) && (
                      <span>Every show already has current access.</span>
                    )}
                  </div>
                </div>
              </section>

              <section className="customer-support-section">
                <div className="admin-panel-heading">
                  <div>
                    <p className="card-kicker">Gameplay</p>
                    <h3>Playthrough history</h3>
                  </div>
                  <strong className="admin-count-badge">{user.attempts.length}</strong>
                </div>

                <div className="support-attempt-list">
                  {activeAttempts.map((attempt) => (
                    <article className="active" key={attempt.id}>
                      <div>
                        <h4>{attempt.show.title} — active</h4>
                        <p>
                          {attempt.playbackStage.replaceAll("_", " ")} · started{" "}
                          {adminDate.format(attempt.createdAt)}
                        </p>
                        <small>
                          Intro {attempt.furthestIntroSeconds}s · Act One{" "}
                          {attempt.furthestActOneSeconds}s · Act Two{" "}
                          {attempt.furthestActTwoSeconds}s ·{" "}
                          Resetting clears only this unfinished playthrough.
                        </small>
                      </div>
                      <form action={resetActiveAttempt}>
                        <input name="attemptId" type="hidden" value={attempt.id} />
                        <input name="userId" type="hidden" value={user.id} />
                        <input name="email" type="hidden" value={user.email} />
                        <button className="button button-ghost" type="submit">
                          Reset active playthrough
                        </button>
                      </form>
                    </article>
                  ))}

                  {completedAttempts.map((attempt) => (
                    <details key={attempt.id}>
                      <summary>
                        <span>
                          <strong>{attempt.show.title}</strong>
                          <small>
                            {adminDate.format(
                              attempt.completedAt ??
                                attempt.accusationSubmittedAt ??
                                attempt.createdAt,
                            )}
                          </small>
                        </span>
                        <span>
                          <strong>
                            {attempt.resultTierName ?? "Result unavailable"}
                          </strong>
                          <small>
                            {attempt.scorePercent !== null
                              ? `${attempt.scorePercent}%`
                              : "No percentage"}
                          </small>
                        </span>
                      </summary>
                      <div className="failed-answer-list">
                        <h4>
                          Incorrect or failed grades ({attempt.answers.length})
                        </h4>
                        {attempt.answers.map((answer) => (
                          <article key={answer.id}>
                            <strong>{answer.question.prompt}</strong>
                            <span>
                              {answer.gradingMethod ?? "Scoring"}:{" "}
                              {answer.gradingReason ?? "No grading detail saved."}
                            </span>
                          </article>
                        ))}
                        {!attempt.answers.length && (
                          <p>No incorrect-answer or grading-failure details.</p>
                        )}
                      </div>
                    </details>
                  ))}

                  {!user.attempts.length && <p>No gameplay records yet.</p>}
                </div>
              </section>
            </article>
          );
        })}
      </div>

      <div className="admin-policy-note">
        <strong>Support control limitations</strong>
        <p>
          These controls change database access only. They do not move money or
          contact a future payment processor. Refund status is allowed only
          when saved gameplay does not show that streaming began.
        </p>
      </div>
    </section>
  );
}
