import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/app-time";
import { secureR2Reference } from "@/lib/cloudflare-r2";
import { formatUsPhone } from "@/lib/phone";
import { displayName } from "@/lib/people";
import { SHOW_DATE_STATUS_LABELS } from "@/lib/show-date-lifecycle";
import { PerformerShowAccessForm } from "../show-access-form";

export const metadata: Metadata = { title: "Performer" };

const APPLICATION_LABELS = {
  PENDING: "Awaiting review",
  APPROVED: "On the roster",
  REJECTED: "Declined",
} as const;

export default async function PerformerDetailPage({
  params,
}: {
  params: Promise<{ performerId: string }>;
}) {
  await requireAdmin();
  const { performerId } = await params;

  const performer = await db.user.findUnique({
    where: { id: performerId },
    include: {
      roleApplications: {
        include: { role: true, show: true },
        orderBy: { appliedAt: "desc" },
      },
      showDateAssignments: {
        include: {
          role: true,
          showDate: { include: { show: { select: { title: true } } } },
        },
        orderBy: { showDate: { date: "desc" } },
      },
      directedShowDates: {
        include: { show: { select: { title: true } } },
        orderBy: { date: "desc" },
      },
      showAccess: { select: { showId: true } },
    },
  });
  if (!performer) notFound();
  if (performer.role === "CUSTOMER") {
    return (
      <>
        <header className="portal-topbar">
          <h1>{displayName(performer)}</h1>
        </header>
        <div className="portal-content">
          <div className="admin-empty-state">
            <strong>Not a troupe member</strong>
            <p>
              This account is a customer. Give them troupe access from{" "}
              <Link href="/admin/troupe">Troupe access</Link> if they should be
              performing.
            </p>
          </div>
        </div>
      </>
    );
  }

  const [headshotUrl, shows] = await Promise.all([
    secureR2Reference(performer.headshotUrl),
    db.show.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const granted = new Set(performer.showAccess.map((access) => access.showId));
  const initialSelected = performer.showAccessRestricted
    ? shows.filter((show) => granted.has(show.id)).map((show) => show.id)
    : shows.map((show) => show.id);

  return (
    <>
      <header className="portal-topbar">
        <h1>{displayName(performer)}</h1>
        <Link className="button button-small button-ghost" href="/admin/performers">
          All performers
        </Link>
      </header>
      <div className="portal-content">
        <section className="portal-panel admin-performer-profile">
          {headshotUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img alt={`Headshot of ${displayName(performer)}`} src={headshotUrl} />
          )}
          <dl className="portal-detail-list">
            <div>
              <dt>Email</dt>
              <dd>{performer.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                {performer.phone ? formatUsPhone(performer.phone) : "Not provided"}
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{performer.address ?? "Not provided"}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>{performer.role === "ADMIN" ? "Administrator" : "Performer"}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(performer.createdAt)}</dd>
            </div>
          </dl>
          {performer.bio && (
            <div className="admin-performer-bio">
              <h2>Bio</h2>
              <p>{performer.bio}</p>
            </div>
          )}
        </section>

        {performer.role === "PERFORMER" && (
          <PerformerShowAccessForm
            initialSelected={initialSelected}
            performerId={performer.id}
            shows={shows}
            unrestricted={!performer.showAccessRestricted}
          />
        )}

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Roster</h2>
            <Link className="button button-small button-ghost" href="/admin/applications">
              Review requests
            </Link>
          </div>
          {performer.roleApplications.length ? (
            <ul className="portal-list">
              {performer.roleApplications.map((application) => (
                <li key={application.id}>
                  <div>
                    <strong>{application.role.name}</strong>
                    <small>{application.show.title}</small>
                  </div>
                  <span
                    className="portal-pill"
                    data-tone={application.status.toLowerCase()}
                  >
                    {APPLICATION_LABELS[application.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-intro">
              They have not put themselves forward for any roles yet.
            </p>
          )}
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Performance history</h2>
          </div>
          {performer.showDateAssignments.length ? (
            <ul className="portal-list">
              {performer.showDateAssignments.map((seat) => (
                <li key={seat.id}>
                  <div>
                    <strong>
                      {seat.role.name} · {seat.showDate.show.title}
                    </strong>
                    <small>{formatDateTime(seat.showDate.date)}</small>
                  </div>
                  <span
                    className="portal-pill"
                    data-tone={seat.status.toLowerCase()}
                  >
                    {seat.status === "CONFIRMED" ? "Confirmed" : "Offered"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-intro">They have not been cast yet.</p>
          )}
        </section>

        {performer.directedShowDates.length > 0 && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Directing</h2>
            </div>
            <ul className="portal-list">
              {performer.directedShowDates.map((showDate) => (
                <li key={showDate.id}>
                  <div>
                    <strong>{showDate.show.title}</strong>
                    <small>{formatDateTime(showDate.date)}</small>
                  </div>
                  <div className="button-row">
                    <span
                      className="portal-pill"
                      data-tone={showDate.status.toLowerCase()}
                    >
                      {SHOW_DATE_STATUS_LABELS[showDate.status]}
                    </span>
                    <Link
                      className="button button-small button-ghost"
                      href={`/admin/casting/${showDate.id}`}
                    >
                      Board
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
