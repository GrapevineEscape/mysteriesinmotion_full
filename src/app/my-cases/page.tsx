import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canStartNewGame, gameCanContinue } from "@/lib/entitlements";

export const metadata: Metadata = { title: "My Case Files" };

const playedDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

export default async function MyCasesPage() {
  const user = await requireUser("/my-cases");
  const purchases =
    user.role === "ADMIN"
      ? []
      : await db.purchase.findMany({
            where: {
              userId: user.id,
              status: { in: ["PAID", "COMPLIMENTARY"] },
            },
            include: { show: true },
            orderBy: { purchasedAt: "desc" },
          });
  const shows =
    user.role === "ADMIN"
      ? await db.show.findMany({ orderBy: { displayOrder: "asc" } })
      : Array.from(
          new Map(
            purchases.map((purchase) => [purchase.showId, purchase.show]),
          ).values(),
        );
  const attempts = await db.caseAttempt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  const attemptsByShow = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const showAttempts = attemptsByShow.get(attempt.showId) ?? [];
    showAttempts.push(attempt);
    attemptsByShow.set(attempt.showId, showAttempts);
  }

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">Your investigation desk</p>
      <h1>My Case Files</h1>
      <p className="page-intro">Signed in as {user.email}</p>
      {shows.length ? (
        <div className="admin-case-grid">
          {shows.map((show) => {
            const showAttempts = attemptsByShow.get(show.id) ?? [];
            const activeAttempt = showAttempts.find(
              (attempt) => !attempt.completedAt,
            );
            const history = showAttempts.filter(
              (attempt) => attempt.completedAt,
            );
            const currentEntitlement = purchases
              .filter((purchase) => purchase.showId === show.id)
              .find((purchase) => canStartNewGame(purchase));
            const activeGame =
              user.role === "ADMIN" ||
              Boolean(activeAttempt && gameCanContinue(activeAttempt));
            const canPlay =
              user.role === "ADMIN" ||
              activeGame ||
              Boolean(currentEntitlement);
            const playLabel = activeAttempt && activeGame
              ? "Resume case"
              : history.length
                ? "Play again"
                : "Begin case";
            const accessMessage =
              user.role === "ADMIN"
                ? "Administrator access does not expire."
                : activeAttempt && activeGame
                  ? "This active game remains available until it is completed."
                  : currentEntitlement?.playWindowEndsAt
                    ? `New games may begin through ${playedDate.format(
                        currentEntitlement.playWindowEndsAt,
                      )}.`
                    : currentEntitlement?.startByAt
                      ? `Begin by ${playedDate.format(
                          currentEntitlement.startByAt,
                        )}. First playback opens 48 hours of replays.`
                      : "This access period has ended. Repurchase is required to begin another game.";

            return (
              <article className="admin-case-card case-history-card" key={show.id}>
                <div>
                  <p className="card-kicker">
                    {activeAttempt
                      ? activeAttempt.status.replaceAll("_", " ")
                      : `${history.length} completed ${
                          history.length === 1 ? "investigation" : "investigations"
                        }`}
                  </p>
                  <h2>{show.title}</h2>
                  <p>{show.shortDescription}</p>
                  <small>{accessMessage}</small>
                </div>

                {history.length > 0 && (
                  <details className="play-history">
                    <summary>
                      Review play history
                      <span>{history.length}</span>
                    </summary>
                    <ol>
                      {history.map((attempt, index) => {
                        const date =
                          attempt.completedAt ??
                          attempt.accusationSubmittedAt ??
                          attempt.createdAt;
                        return (
                          <li key={attempt.id}>
                            <div>
                              <strong>Play {history.length - index}</strong>
                              <time dateTime={date.toISOString()}>
                                {playedDate.format(date)}
                              </time>
                            </div>
                            <div className="history-result">
                              <strong>
                                {attempt.resultTierName ?? "Result unavailable"}
                              </strong>
                              {attempt.scorePercent !== null && (
                                <span>{attempt.scorePercent}%</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                )}

                {canPlay ? (
                  <Link
                    className="button button-primary"
                    href={`/play/${show.slug}`}
                  >
                    {playLabel}
                  </Link>
                ) : (
                  <button className="button button-disabled" disabled>
                    Purchase again — Square coming next
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>No purchased mysteries are attached to this account yet.</p>
          <Link className="button button-primary" href="/mysteries">
            Browse mysteries
          </Link>
        </div>
      )}
      <form action="/api/auth/sign-out" method="post">
        <button className="text-link" type="submit">Sign out</button>
      </form>
    </section>
  );
}
