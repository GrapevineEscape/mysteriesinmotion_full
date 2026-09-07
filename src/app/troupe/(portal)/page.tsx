import type { Metadata } from "next";
import Link from "next/link";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/app-time";
import { PortalTour, StartTourLink } from "@/components/troupe/portal-tour";
import {
  applyAutoClose,
  castingOpenWhere,
  upcomingWhere,
} from "@/lib/show-date-lifecycle";

export const metadata: Metadata = { title: "Dashboard" };

const APPLICATION_LABELS = {
  PENDING: "Pending review",
  APPROVED: "On roster",
  REJECTED: "Unavailable",
} as const;

/**
 * The four profile details casting relies on. Shown as a fraction so an
 * incomplete profile is visible without nagging.
 */
function profileCompleteness(member: {
  phone: string | null;
  address: string | null;
  headshotUrl: string | null;
  bio: string | null;
}) {
  const fields = [member.phone, member.address, member.headshotUrl, member.bio];
  return { complete: fields.filter(Boolean).length, total: fields.length };
}

export default async function TroupeDashboardPage() {
  const member = await requireTroupe();
  await applyAutoClose();

  const [applications, pendingOffers, openDates, directing] = await Promise.all([
    db.roleApplication.findMany({
      where: { performerId: member.id },
      include: { show: true, role: true },
      orderBy: { appliedAt: "desc" },
    }),
    db.showDateAssignment.findMany({
      where: { performerId: member.id, status: "OFFERED" },
      include: { role: true, showDate: { include: { show: true } } },
      orderBy: { showDate: { date: "asc" } },
    }),
    db.showDate.findMany({
      where: castingOpenWhere(),
      include: { show: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.showDate.findMany({
      where: { directorId: member.id, ...upcomingWhere() },
      include: { show: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const profile = profileCompleteness(member);

  return (
    <>
      <PortalTour autoStart />
      <header className="portal-topbar">
        <h1>Dashboard</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Welcome back{member.firstName ? `, ${member.firstName}` : ""}. Roster
          interest and show-date casting are separate things.{" "}
          <StartTourLink>Take the walkthrough</StartTourLink>
        </p>

        {pendingOffers.length > 0 && (
          <section className="portal-panel portal-panel-emphasis">
            <div className="portal-panel-heading">
              <h2>Offers awaiting your response</h2>
            </div>
            <ul className="portal-list">
              {pendingOffers.map((offer) => (
                <li key={offer.id}>
                  <div>
                    <strong>{offer.role.name}</strong> ·{" "}
                    {offer.showDate.show.title}
                    <p className="muted">{formatDateTime(offer.showDate.date)}</p>
                  </div>
                  <Link
                    className="button button-small button-primary"
                    href={`/troupe/casting/${offer.showDateId}`}
                  >
                    Accept or decline
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="portal-stat-grid">
          <Link
            className="portal-stat"
            data-emphasis={pendingOffers.length > 0}
            href="/troupe/casting"
          >
            <span className="portal-stat-value">{pendingOffers.length}</span>
            <span className="portal-stat-label">Offers to answer</span>
          </Link>
          <Link className="portal-stat" href="/troupe/shows">
            <span className="portal-stat-value">{pendingCount}</span>
            <span className="portal-stat-label">Roster pending</span>
          </Link>
          <Link className="portal-stat" href="/troupe/shows">
            <span className="portal-stat-value">{approvedCount}</span>
            <span className="portal-stat-label">On role roster</span>
          </Link>
          <Link
            className="portal-stat"
            data-emphasis={profile.complete < profile.total}
            href="/troupe/profile"
          >
            <span className="portal-stat-value">
              {profile.complete}/{profile.total}
            </span>
            <span className="portal-stat-label">Profile completeness</span>
          </Link>
        </div>

        {directing.length > 0 && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Dates you are directing</h2>
            </div>
            <ul className="portal-list">
              {directing.map((showDate) => (
                <li key={showDate.id}>
                  <div>
                    <strong>{showDate.show.title}</strong>
                    <p className="muted">
                      {formatDateTime(showDate.date)}
                      {showDate.location ? ` · ${showDate.location}` : ""}
                    </p>
                  </div>
                  <Link
                    className="button button-small button-primary"
                    href={`/admin/casting/${showDate.id}`}
                  >
                    Casting board
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Open show dates</h2>
            <Link className="button button-small button-ghost" href="/troupe/casting">
              All show dates
            </Link>
          </div>
          {openDates.length ? (
            <ul className="portal-list">
              {openDates.map((showDate) => (
                <li key={showDate.id}>
                  <div>
                    <strong>{showDate.show.title}</strong>
                    <p className="muted">
                      {formatDateTime(showDate.date)}
                      {showDate.location ? ` · ${showDate.location}` : ""}
                    </p>
                  </div>
                  <Link
                    className="button button-small button-ghost"
                    href={`/troupe/casting/${showDate.id}`}
                  >
                    I am available
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-empty-state">
              <strong>Nothing open yet</strong>
              <p>When casting opens for a date, it will appear here.</p>
            </div>
          )}
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Recent roster interest</h2>
            <Link className="button button-small button-ghost" href="/troupe/shows">
              Browse shows
            </Link>
          </div>
          {applications.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Show</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 6).map((application) => (
                    <tr key={application.id}>
                      <td>{application.show.title}</td>
                      <td>{application.role.name}</td>
                      <td>
                        <span
                          className="portal-pill"
                          data-tone={application.status.toLowerCase()}
                        >
                          {APPLICATION_LABELS[application.status]}
                        </span>
                      </td>
                      <td className="muted">{formatDate(application.appliedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>No future-role interest yet</strong>
              <p>Open Shows to mark roles you would play someday.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
