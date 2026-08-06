import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { appToday, formatDateTime } from "@/lib/app-time";
import { displayName } from "@/lib/people";
import {
  applyAutoClose,
  castingStatusLabel,
  isForwardVisible,
  SHOW_DATE_STATUS_LABELS,
} from "@/lib/show-date-lifecycle";

export const metadata: Metadata = { title: "Show dates" };

const HISTORY_LIMIT = 25;

export default async function ShowDatesPage() {
  await requireAdmin();
  await applyAutoClose();

  const showDates = await db.showDate.findMany({
    include: {
      show: { select: { title: true, slug: true, _count: { select: { roles: true } } } },
      director: true,
      _count: { select: { rehearsals: true } },
      assignments: { select: { status: true } },
    },
    orderBy: { date: "asc" },
  });

  const today = appToday();
  const forward = showDates.filter((showDate) => isForwardVisible(showDate, today));
  const history = showDates
    .filter((showDate) => !isForwardVisible(showDate, today))
    .reverse()
    .slice(0, HISTORY_LIMIT);

  function row(showDate: (typeof showDates)[number]) {
    const confirmed = showDate.assignments.filter(
      (seat) => seat.status === "CONFIRMED",
    ).length;
    const offered = showDate.assignments.length - confirmed;

    return (
      <tr key={showDate.id}>
        <td>
          <strong>{showDate.show.title}</strong>
          {showDate.customer && (
            <>
              <br />
              <small>for {showDate.customer}</small>
            </>
          )}
        </td>
        <td>{formatDateTime(showDate.date)}</td>
        <td>{showDate.location ?? "—"}</td>
        <td>{showDate.director ? displayName(showDate.director) : "—"}</td>
        <td>
          <span className="portal-pill" data-tone={showDate.status.toLowerCase()}>
            {SHOW_DATE_STATUS_LABELS[showDate.status]}
          </span>
        </td>
        <td>
          {castingStatusLabel(showDate.show._count.roles, confirmed, offered)}
          <br />
          <small>
            {showDate._count.rehearsals}{" "}
            {showDate._count.rehearsals === 1 ? "rehearsal" : "rehearsals"}
          </small>
        </td>
        <td>
          <div className="button-row">
            {showDate.status === "DRAFT" ? (
              <Link
                className="button button-small button-primary"
                href={`/admin/show-dates/${showDate.id}/cast`}
              >
                Resume setup
              </Link>
            ) : (
              <Link
                className="button button-small button-primary"
                href={`/admin/casting/${showDate.id}`}
              >
                Casting
              </Link>
            )}
            <Link
              className="button button-small button-ghost"
              href={`/admin/show-dates/${showDate.id}`}
            >
              Edit
            </Link>
          </div>
        </td>
      </tr>
    );
  }

  const headings = (
    <tr>
      <th>Show</th>
      <th>When</th>
      <th>Location</th>
      <th>Director</th>
      <th>Status</th>
      <th>Casting</th>
      <th />
    </tr>
  );

  return (
    <>
      <header className="portal-topbar">
        <h1>Show dates</h1>
        <Link
          className="button button-small button-primary"
          href="/admin/show-dates/new"
        >
          Book a performance
        </Link>
      </header>
      <div className="portal-content">
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Coming up</h2>
            <Link className="button button-small button-ghost" href="/admin/calendar">
              Calendar view
            </Link>
          </div>
          {forward.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>{headings}</thead>
                <tbody>{forward.map(row)}</tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>Nothing scheduled</strong>
              <p>Book a performance to start the setup wizard.</p>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Recently performed</h2>
            </div>
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>{headings}</thead>
                <tbody>{history.map(row)}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
