import type { Metadata } from "next";
import Link from "next/link";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedShowIds } from "@/lib/show-access";
import { formatDateTime } from "@/lib/app-time";
import {
  applyAutoClose,
  castingOpenWhere,
  SHOW_DATE_STATUS_LABELS,
} from "@/lib/show-date-lifecycle";

export const metadata: Metadata = { title: "Show dates" };

export default async function CastingDatesPage() {
  const member = await requireTroupe();
  await applyAutoClose();
  const allowed = await allowedShowIds(member);

  const dates = await db.showDate.findMany({
    where: {
      ...castingOpenWhere(),
      ...(allowed ? { showId: { in: allowed } } : {}),
    },
    include: {
      show: true,
      assignments: {
        where: { performerId: member.id },
        include: { role: true },
      },
      _count: { select: { interests: { where: { performerId: member.id } } } },
    },
    orderBy: { date: "asc" },
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Show dates</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Opt in for a <strong>specific performance</strong> and its rehearsals.
          This is different from the standing role interest under Shows: here
          you are signing up for one date. Past dates close automatically the
          day after the show.
        </p>

        <section className="portal-panel">
          {dates.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>When</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Your status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dates.map((showDate) => {
                    const seat = showDate.assignments[0] ?? null;
                    const interestCount = showDate._count.interests;
                    return (
                      <tr key={showDate.id}>
                        <td>
                          <strong>{showDate.show.title}</strong>
                        </td>
                        <td>{formatDateTime(showDate.date)}</td>
                        <td>{showDate.location ?? "—"}</td>
                        <td>
                          <span
                            className="portal-pill"
                            data-tone={showDate.status.toLowerCase()}
                          >
                            {SHOW_DATE_STATUS_LABELS[showDate.status]}
                          </span>
                        </td>
                        <td>
                          {seat?.status === "CONFIRMED" ? (
                            <span className="portal-pill" data-tone="confirmed">
                              Cast as {seat.role.name}
                            </span>
                          ) : seat?.status === "OFFERED" ? (
                            <span className="portal-pill" data-tone="offered">
                              Offer: {seat.role.name}
                            </span>
                          ) : interestCount ? (
                            <span className="muted">
                              Applied for {interestCount}{" "}
                              {interestCount === 1 ? "role" : "roles"}
                            </span>
                          ) : (
                            <span className="muted">Not opted in</span>
                          )}
                        </td>
                        <td>
                          <Link
                            className="button button-small button-primary"
                            href={`/troupe/casting/${showDate.id}`}
                          >
                            {seat?.status === "OFFERED" ? "Respond" : "Open"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>No open casting dates</strong>
              <p>When administration opens a show date, it will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
