import type { Metadata } from "next";
import Link from "next/link";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { displayName } from "@/lib/people";
import {
  applyAutoClose,
  castingStatusLabel,
  SHOW_DATE_STATUS_LABELS,
  upcomingWhere,
} from "@/lib/show-date-lifecycle";

export const metadata: Metadata = { title: "Casting boards" };

/**
 * Directors reach this page without being administrators, so it lists only the
 * performances they are responsible for.
 */
export default async function CastingBoardsPage() {
  const member = await requireTroupe("/admin/casting");
  await applyAutoClose();

  const isAdmin = member.role === "ADMIN";
  const showDates = await db.showDate.findMany({
    where: {
      ...upcomingWhere(),
      status: { in: ["OPEN", "FULLY_CAST"] },
      ...(isAdmin ? {} : { directorId: member.id }),
    },
    include: {
      show: { select: { title: true, _count: { select: { roles: true } } } },
      director: true,
      assignments: { select: { status: true } },
      _count: { select: { interests: true } },
    },
    orderBy: { date: "asc" },
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Casting boards</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          {isAdmin
            ? "Every performance with casting open. Offer a seat to someone who put themselves forward, and they confirm it from their own portal."
            : "The performances you are directing. Offer a seat to someone who put themselves forward, and they confirm it from their own portal."}
        </p>

        {showDates.length ? (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Show</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Casting</th>
                  <th>Interest</th>
                  {isAdmin && <th>Director</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {showDates.map((showDate) => {
                  const confirmed = showDate.assignments.filter(
                    (seat) => seat.status === "CONFIRMED",
                  ).length;
                  return (
                    <tr key={showDate.id}>
                      <td>
                        <strong>{showDate.show.title}</strong>
                        <br />
                        <small>{showDate.location ?? "Location to be set"}</small>
                      </td>
                      <td>{formatDateTime(showDate.date)}</td>
                      <td>
                        <span
                          className="portal-pill"
                          data-tone={showDate.status.toLowerCase()}
                        >
                          {SHOW_DATE_STATUS_LABELS[showDate.status]}
                        </span>
                      </td>
                      <td>
                        {castingStatusLabel(
                          showDate.show._count.roles,
                          confirmed,
                          showDate.assignments.length - confirmed,
                        )}
                      </td>
                      <td>
                        {showDate._count.interests}{" "}
                        {showDate._count.interests === 1 ? "applicant" : "applicants"}
                      </td>
                      {isAdmin && (
                        <td>
                          {showDate.director
                            ? displayName(showDate.director)
                            : "Not assigned"}
                        </td>
                      )}
                      <td>
                        <Link
                          className="button button-small button-primary"
                          href={`/admin/casting/${showDate.id}`}
                        >
                          Open board
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
            <strong>No casting open</strong>
            <p>
              {isAdmin ? (
                <>
                  Publish a performance from{" "}
                  <Link href="/admin/show-dates">Show dates</Link> to open its
                  casting board.
                </>
              ) : (
                "You are not directing any performances with casting open."
              )}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
