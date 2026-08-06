import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  evaluateShowReadiness,
  showReadinessInclude,
} from "@/lib/show-readiness";

export const metadata: Metadata = { title: "Case Configuration" };

export default async function OnlineOperationsPage() {
  await requireAdmin();

  const shows = await db.show.findMany({
    where: { type: "ONLINE" },
    orderBy: { displayOrder: "asc" },
    include: showReadinessInclude,
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Case configuration</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Presentation, videos, clues, and accusation questions for the online
          mysteries. Live productions are managed under{" "}
          <Link href="/admin/catalog">Shows and roles</Link>.
        </p>

        {shows.length ? (
          <div className="admin-case-grid">
            {shows.map((show) => {
              const readiness = evaluateShowReadiness(show);
              return (
                <article className="admin-case-card" key={show.id}>
                  <div className="admin-card-copy">
                    <p className={`admin-status ${show.status.toLowerCase()}`}>
                      {show.status}
                    </p>
                    <h2>{show.title}</h2>
                    <p>
                      ${((show.online?.priceCents ?? 0) / 100).toFixed(2)} ·{" "}
                      {show.online?.inventoryEnabled
                        ? "Inventory enabled"
                        : "No inventory"}
                    </p>
                    <p
                      className={`readiness-card-status ${
                        readiness.readyToPublish ? "ready" : "blocked"
                      }`}
                    >
                      {readiness.readyToPublish
                        ? "✓ Automated launch checks passed"
                        : `! ${readiness.blockers.length} launch ${
                            readiness.blockers.length === 1 ? "issue" : "issues"
                          }`}
                    </p>
                  </div>
                  <div className="admin-card-actions">
                    <Link
                      className="button button-primary"
                      href={`/admin/shows/${show.slug}`}
                    >
                      Open show setup
                    </Link>
                    <Link href={`/admin/shows/${show.slug}/questions`}>Questions</Link>
                    <Link href={`/admin/shows/${show.slug}/clues`}>Clues</Link>
                    <Link href={`/admin/shows/${show.slug}/readiness`}>Readiness</Link>
                    <Link href={`/play/${show.slug}`}>Preview ↗</Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>No online mysteries yet</strong>
            <p>
              Add a show of type Online under{" "}
              <Link href="/admin/catalog">Shows and roles</Link>, then configure
              its video and questions here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
