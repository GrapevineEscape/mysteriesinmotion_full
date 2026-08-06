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
  REHEARSAL_COLOR,
  SHOW_DATE_STATUS_COLORS,
  SHOW_DATE_STATUS_LABELS,
} from "@/lib/show-date-lifecycle";
import {
  TroupeCalendar,
  type CalendarEvent,
} from "@/components/troupe/troupe-calendar";

export const metadata: Metadata = { title: "Calendar" };

const HISTORY_LIMIT = 25;

export default async function AdminCalendarPage() {
  await requireAdmin();
  await applyAutoClose();

  const showDates = await db.showDate.findMany({
    include: {
      show: { select: { title: true, _count: { select: { roles: true } } } },
      director: true,
      rehearsals: { orderBy: { date: "asc" } },
      assignments: { select: { status: true } },
    },
    orderBy: { date: "asc" },
  });

  const events: CalendarEvent[] = [];

  for (const showDate of showDates) {
    const confirmed = showDate.assignments.filter(
      (seat) => seat.status === "CONFIRMED",
    ).length;
    const casting = {
      label: "Casting",
      value: castingStatusLabel(
        showDate.show._count.roles,
        confirmed,
        showDate.assignments.length - confirmed,
      ),
    };

    events.push({
      id: showDate.id,
      title: showDate.show.title,
      start: showDate.date.toISOString(),
      color: SHOW_DATE_STATUS_COLORS[showDate.status],
      kind: "Show",
      when: formatDateTime(showDate.date),
      location: showDate.location ?? "—",
      statusLabel: SHOW_DATE_STATUS_LABELS[showDate.status],
      detail: casting,
      notes: showDate.notes,
      castingHref:
        showDate.status === "DRAFT"
          ? `/admin/show-dates/${showDate.id}`
          : `/admin/casting/${showDate.id}`,
    });

    for (const rehearsal of showDate.rehearsals) {
      events.push({
        id: `rehearsal-${rehearsal.id}`,
        title: `Rehearsal · ${showDate.show.title}`,
        start: rehearsal.date.toISOString(),
        color: REHEARSAL_COLOR,
        kind: "Rehearsal",
        when: formatDateTime(rehearsal.date),
        location: rehearsal.location,
        statusLabel: "Rehearsal",
        detail: casting,
        notes: rehearsal.notes,
        castingHref: `/admin/show-dates/${showDate.id}`,
      });
    }
  }

  const today = appToday();
  const history = showDates
    .filter((showDate) => !isForwardVisible(showDate, today))
    .reverse()
    .slice(0, HISTORY_LIMIT);

  return (
    <>
      <header className="portal-topbar">
        <h1>Calendar</h1>
        <div className="button-row">
          <Link
            className="button button-small button-primary"
            href="/admin/show-dates/new"
          >
            Book a performance
          </Link>
          <Link className="button button-small button-ghost" href="/admin/show-dates">
            List view
          </Link>
        </div>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Everything scheduled, drafts included. Click a performance to see how
          casting is going or to open its board.
        </p>

        <TroupeCalendar events={events} />

        {history.length > 0 && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Recently performed</h2>
            </div>
            <ul className="portal-list">
              {history.map((showDate) => (
                <li key={showDate.id}>
                  <div>
                    <strong>{showDate.show.title}</strong>
                    <small>
                      {formatDateTime(showDate.date)} ·{" "}
                      {showDate.location ?? "Location not recorded"}
                    </small>
                  </div>
                  <div className="button-row">
                    <span>
                      {showDate.director
                        ? displayName(showDate.director)
                        : "No director"}
                    </span>
                    <Link
                      className="button button-small button-ghost"
                      href={`/admin/casting/${showDate.id}`}
                    >
                      Cast list
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
