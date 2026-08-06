import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  evaluateShowReadiness,
  showReadinessInclude,
} from "@/lib/show-readiness";

export const metadata: Metadata = { title: "Show Administration" };

export default async function AdminPage() {
  const shows = await db.show.findMany({
    orderBy: { displayOrder: "asc" },
    include: showReadinessInclude,
  });
  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">Administrator</p>
      <h1>Show Administration</h1>
      <p className="page-intro">
        Choose a mystery to manage its presentation, videos, clues, and
        accusation questions.
      </p>
      <div className="admin-top-actions">
        <Link className="button button-primary" href="/admin/business">
          Business dashboard
        </Link>
        <Link className="button button-ghost" href="/admin/customers">
          Customer support
        </Link>
      </div>
      <div className="admin-dashboard-summary">
        <div><strong>{shows.length}</strong><span>Online mysteries</span></div>
        <div><strong>{shows.filter((show) => show.status === "PUBLISHED").length}</strong><span>Published</span></div>
        <div><strong>$10</strong><span>Price per show</span></div>
      </div>
      <div className="admin-case-grid">
        {shows.map((show) => {
          const readiness = evaluateShowReadiness(show);
          return (
          <article className="admin-case-card" key={show.id}>
            <div className="admin-card-copy">
              <p className={`admin-status ${show.status.toLowerCase()}`}>{show.status}</p>
              <h2>{show.title}</h2>
              <p>
                ${(show.priceCents / 100).toFixed(2)} ·{" "}
                {show.inventoryEnabled ? "Inventory enabled" : "No inventory"}
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
              <Link className="button button-primary" href={`/admin/shows/${show.slug}`}>
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
    </section>
  );
}
