import type { Metadata } from "next";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { appToday, formatDateTime } from "@/lib/app-time";
import {
  applyAutoClose,
  isCastingOpen,
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

export default async function TroupeCalendarPage() {
  const member = await requireTroupe();
  await applyAutoClose();

  // Drafts are administration's business. Everything else is included so
  // browsing back through the year still shows what happened.
  const showDates = await db.showDate.findMany({
    where: { status: { not: "DRAFT" } },
    include: {
      show: true,
      rehearsals: { orderBy: { date: "asc" } },
      assignments: { where: { performerId: member.id }, include: { role: true } },
    },
    orderBy: { date: "asc" },
  });

  const events: CalendarEvent[] = [];

  for (const showDate of showDates) {
    const seat = showDate.assignments[0];
    const yourRole = seat
      ? {
          label: "Your role",
          value:
            seat.status === "OFFERED"
              ? `${seat.role.name} (offer pending)`
              : seat.role.name,
        }
      : null;

    events.push({
      id: showDate.id,
      title: showDate.show.title,
      start: showDate.date.toISOString(),
      color: SHOW_DATE_STATUS_COLORS[showDate.status],
      kind: "Show",
      when: formatDateTime(showDate.date),
      location: showDate.location ?? "—",
      statusLabel: SHOW_DATE_STATUS_LABELS[showDate.status],
      detail: yourRole,
      notes: null,
      castingHref: isCastingOpen(showDate)
        ? `/troupe/casting/${showDate.id}`
        : null,
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
        detail: yourRole,
        notes: rehearsal.notes,
        castingHref: null,
      });
    }
  }

  const today = appToday();
  const upcoming = showDates.filter((showDate) =>
    isForwardVisible(showDate, today),
  );

  return (
    <>
      <header className="portal-topbar">
        <h1>Calendar</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Upcoming dates are listed below. Browse earlier months on the calendar
          for closed shows and past cancellations. Drafts are hidden. Select an
          event for its details.
        </p>

        <section className="portal-panel">
          <TroupeCalendar events={events} />
        </section>

        {upcoming.length > 0 && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Upcoming</h2>
            </div>
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>When</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((showDate) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
