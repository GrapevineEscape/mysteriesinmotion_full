import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { displayName } from "@/lib/people";
import { seatState } from "@/lib/casting-rules";
import {
  applyAutoClose,
  castingStatusLabel,
  isCastingOpen,
  SHOW_DATE_STATUS_LABELS,
} from "@/lib/show-date-lifecycle";
import { OfferResponse } from "./offer-response";

type PageProps = { params: Promise<{ showDateId: string }> };

export const metadata: Metadata = { title: "Show date" };

export default async function CastingDateDetailPage({ params }: PageProps) {
  const member = await requireTroupe();
  const { showDateId } = await params;
  await applyAutoClose();

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: {
      show: { include: { roles: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } },
      rehearsals: { orderBy: { date: "asc" } },
      assignments: { include: { performer: true, role: true } },
      interests: { where: { performerId: member.id } },
    },
  });
  if (!showDate) notFound();

  // Casting closes the day after the performance, and a draft date is not yet
  // public, so there is nothing here for a performer to act on.
  if (!isCastingOpen(showDate)) redirect("/troupe/casting");

  const assignmentByRole = new Map(showDate.assignments.map((a) => [a.roleId, a]));
  const interestByRole = new Map(showDate.interests.map((i) => [i.roleId, i]));
  const mySeat = showDate.assignments.find((a) => a.performerId === member.id) ?? null;

  const confirmedCount = showDate.assignments.filter(
    (a) => a.status === "CONFIRMED",
  ).length;
  const offeredCount = showDate.assignments.length - confirmedCount;

  return (
    <>
      <header className="portal-topbar">
        <h1>This show date</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          <Link href="/troupe/casting">← All show dates</Link>
        </p>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>{showDate.show.title}</h2>
            <span className="portal-pill" data-tone={showDate.status.toLowerCase()}>
              {SHOW_DATE_STATUS_LABELS[showDate.status]}
            </span>
          </div>
          <dl className="portal-meta-grid">
            <div>
              <dt>Performance</dt>
              <dd>{formatDateTime(showDate.date)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{showDate.location ?? "—"}</dd>
            </div>
            <div>
              <dt>Casting</dt>
              <dd>
                {castingStatusLabel(
                  showDate.show.roles.length,
                  confirmedCount,
                  offeredCount,
                )}
              </dd>
            </div>
          </dl>

          <h3>Rehearsals</h3>
          {showDate.rehearsals.length ? (
            <ul className="portal-list">
              {showDate.rehearsals.map((rehearsal) => (
                <li key={rehearsal.id}>
                  <div>
                    <strong>{formatDateTime(rehearsal.date)}</strong>
                    <span className="muted"> · {rehearsal.location}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No regular rehearsals listed yet.</p>
          )}

          <h3>Tech rehearsal</h3>
          {showDate.techDate ? (
            <p>
              <strong>{formatDateTime(showDate.techDate)}</strong>
              <span className="muted">
                {" "}
                · {showDate.techLocation ?? showDate.location ?? "—"}
              </span>
            </p>
          ) : (
            <p className="muted">No tech rehearsal set yet.</p>
          )}
        </section>

        {mySeat?.status === "OFFERED" && (
          <section className="portal-panel portal-panel-emphasis">
            <div className="portal-panel-heading">
              <h2>You have been offered {mySeat.role.name}</h2>
            </div>
            <p>Accept to confirm the seat, or decline to return it to open.</p>
            <OfferResponse
              assignmentId={mySeat.id}
              roleName={mySeat.role.name}
            />
          </section>
        )}

        {mySeat?.status === "CONFIRMED" && (
          <section className="portal-panel">
            <p>
              <strong>You are cast as {mySeat.role.name}</strong> for this
              performance.
            </p>
          </section>
        )}

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Roles</h2>
          </div>
          <p className="muted">
            You are signing up for this date only, not the standing role list.
            Apply for as many open roles as you would play.
          </p>

          {showDate.show.roles.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Notes</th>
                    <th>Seat</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {showDate.show.roles.map((role) => {
                    const assignment = assignmentByRole.get(role.id) ?? null;
                    const state = seatState(assignment);
                    const application = interestByRole.get(role.id);
                    const hasConflicts =
                      application &&
                      (application.conflictTech ||
                        application.conflictRehearsalIds.length > 0);

                    return (
                      <tr key={role.id} data-filled={state === "Confirmed"}>
                        <td>
                          <strong>{role.name}</strong>
                          <p className="muted">
                            {role.gender} · {role.age}
                          </p>
                        </td>
                        <td className="portal-cell-prose">{role.description}</td>
                        <td>
                          <span
                            className="portal-pill"
                            data-tone={state.toLowerCase()}
                          >
                            {state === "Open"
                              ? "Open"
                              : `${state} · ${displayName(assignment!.performer)}`}
                          </span>
                          {application && (
                            <p className="muted">
                              You applied
                              {hasConflicts ? " · conflicts noted" : ""}
                            </p>
                          )}
                        </td>
                        <td>
                          {state === "Confirmed" ? (
                            <span className="muted">Unavailable</span>
                          ) : (
                            <Link
                              className={
                                application
                                  ? "button button-small button-ghost"
                                  : "button button-small button-primary"
                              }
                              href={`/troupe/casting/${showDate.id}/roles/${role.id}`}
                            >
                              {application ? "Edit application" : "I am interested"}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>No roles listed</strong>
              <p>This show does not have roles defined yet.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
