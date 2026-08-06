import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";
import {
  applyAutoClose,
  SHOW_DATE_STATUS_LABELS,
  upcomingWhere,
} from "@/lib/show-date-lifecycle";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  await applyAutoClose();

  const [
    pendingApplications,
    pendingBookings,
    liveShowCount,
    onlineShowCount,
    publishedOnlineCount,
    performerCount,
    upcoming,
    draftDates,
  ] = await Promise.all([
    db.roleApplication.count({ where: { status: "PENDING" } }),
    db.booking.count({ where: { status: "PENDING" } }),
    db.show.count({ where: { type: { in: LIVE_SHOW_TYPES } } }),
    db.show.count({ where: { type: "ONLINE" } }),
    db.show.count({ where: { type: "ONLINE", status: "PUBLISHED" } }),
    db.user.count({ where: { role: "PERFORMER" } }),
    db.showDate.findMany({
      where: upcomingWhere(),
      include: { show: true, _count: { select: { assignments: true } } },
      orderBy: { date: "asc" },
      take: 6,
    }),
    db.showDate.count({ where: { status: "DRAFT" } }),
  ]);

  const needsAttention = [
    pendingApplications > 0 && {
      href: "/admin/applications",
      label: `${pendingApplications} roster ${pendingApplications === 1 ? "request" : "requests"} awaiting review`,
    },
    pendingBookings > 0 && {
      href: "/admin/bookings",
      label: `${pendingBookings} booking ${pendingBookings === 1 ? "inquiry" : "inquiries"} to answer`,
    },
    draftDates > 0 && {
      href: "/admin/show-dates",
      label: `${draftDates} show ${draftDates === 1 ? "date" : "dates"} still in setup`,
    },
  ].filter((entry): entry is { href: string; label: string } => Boolean(entry));

  return (
    <>
      <header className="portal-topbar">
        <h1>Dashboard</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Both sides of the business in one place: live performances the troupe
          puts on, and the online mysteries people play at home.
        </p>

        {needsAttention.length > 0 && (
          <section className="portal-panel portal-panel-emphasis">
            <div className="portal-panel-heading">
              <h2>Needs your attention</h2>
            </div>
            <ul className="portal-list">
              {needsAttention.map((entry) => (
                <li key={entry.href}>
                  <span>{entry.label}</span>
                  <Link className="button button-small button-primary" href={entry.href}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="portal-stat-grid">
          <Link className="portal-stat" href="/admin/catalog">
            <span className="portal-stat-value">{liveShowCount}</span>
            <span className="portal-stat-label">Live productions</span>
          </Link>
          <Link className="portal-stat" href="/admin/online">
            <span className="portal-stat-value">
              {publishedOnlineCount}/{onlineShowCount}
            </span>
            <span className="portal-stat-label">Online cases published</span>
          </Link>
          <Link className="portal-stat" href="/admin/performers">
            <span className="portal-stat-value">{performerCount}</span>
            <span className="portal-stat-label">Performers</span>
          </Link>
          <Link
            className="portal-stat"
            data-emphasis={pendingBookings > 0}
            href="/admin/bookings"
          >
            <span className="portal-stat-value">{pendingBookings}</span>
            <span className="portal-stat-label">Booking inquiries</span>
          </Link>
        </div>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Upcoming performances</h2>
            <div className="button-row">
              <Link className="button button-small button-primary" href="/admin/show-dates/new">
                Book a performance
              </Link>
              <Link className="button button-small button-ghost" href="/admin/show-dates">
                All show dates
              </Link>
            </div>
          </div>
          {upcoming.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>When</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Seats</th>
                    <th />
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
                      <td>{showDate._count.assignments}</td>
                      <td>
                        <Link
                          className="button button-small button-ghost"
                          href={
                            showDate.status === "DRAFT"
                              ? `/admin/show-dates/${showDate.id}/cast`
                              : `/admin/casting/${showDate.id}`
                          }
                        >
                          {showDate.status === "DRAFT" ? "Resume setup" : "Casting board"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>Nothing on the books</strong>
              <p>Book a performance to start casting it.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
