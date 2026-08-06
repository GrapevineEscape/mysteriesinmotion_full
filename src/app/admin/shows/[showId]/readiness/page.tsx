import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShowNav } from "@/components/admin-show-nav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  evaluateShowReadiness,
  showReadinessInclude,
} from "@/lib/show-readiness";

export default async function ShowReadinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ publish?: string }>;
}) {
  await requireAdmin();
  const { showId } = await params;
  const { publish } = await searchParams;
  const show = await db.show.findUnique({
    where: { slug: showId },
    include: showReadinessInclude,
  });
  if (!show) notFound();

  const readiness = evaluateShowReadiness(show);

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">{show.title}</p>
      <h1>Launch Readiness</h1>
      <p className="page-intro">
        Automated checks prevent an incomplete mystery from being published.
        The two preview checks require a person because video duration and the
        customer experience cannot be proven from saved settings alone.
      </p>
      <AdminShowNav active="readiness" slug={show.slug} />

      {publish === "blocked" && (
        <div className="admin-alert admin-alert-error" role="alert">
          <strong>Publication was blocked.</strong>
          <span>
            Your other changes were saved as a draft. Resolve every red item
            below, then publish from Show Setup.
          </span>
        </div>
      )}

      <div
        className={`readiness-hero ${
          readiness.readyToPublish ? "ready" : "blocked"
        }`}
      >
        <div>
          <p className="card-kicker">
            {readiness.readyToPublish ? "Automated checks passed" : "Not ready"}
          </p>
          <h2>
            {readiness.readyToPublish
              ? "Ready for final human preview"
              : `${readiness.blockers.length} ${
                  readiness.blockers.length === 1 ? "issue blocks" : "issues block"
                } publication`}
          </h2>
        </div>
        <strong>
          {readiness.items.length - readiness.blockers.length}/
          {readiness.items.length}
        </strong>
      </div>

      <div className="readiness-list">
        {readiness.items.map((check) => (
          <article className={check.state.toLowerCase()} key={check.label}>
            <span aria-hidden="true" className="readiness-icon">
              {check.state === "READY"
                ? "✓"
                : check.state === "BLOCKED"
                  ? "!"
                  : "○"}
            </span>
            <div>
              <div className="readiness-title-line">
                <h3>{check.label}</h3>
                <span>{check.state === "VERIFY" ? "Manual check" : check.state}</span>
              </div>
              <p>{check.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-action-buttons">
        <Link className="button button-primary" href={`/play/${show.slug}`}>
          Run customer preview
        </Link>
        <Link className="button button-ghost" href={`/admin/shows/${show.slug}`}>
          Return to Show Setup
        </Link>
      </div>
    </section>
  );
}
