import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { castingBoard, requireCastingManager } from "@/lib/casting";
import { displayName } from "@/lib/people";
import {
  applyAutoClose,
  castingStatusLabel,
  SHOW_DATE_STATUS_LABELS,
} from "@/lib/show-date-lifecycle";
import { OfferControls, WithdrawControls } from "./seat-controls";

export const metadata: Metadata = { title: "Casting board" };

export default async function CastingBoardPage({
  params,
}: {
  params: Promise<{ showDateId: string }>;
}) {
  const { showDateId } = await params;
  await applyAutoClose();

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: {
      show: { select: { title: true, slug: true } },
      director: true,
      rehearsals: { orderBy: { date: "asc" } },
    },
  });
  if (!showDate) notFound();

  const member = await requireCastingManager(showDate);
  const rows = await castingBoard(showDate);

  const rehearsalLabels = new Map(
    showDate.rehearsals.map((rehearsal) => [
      rehearsal.id,
      formatDateTime(rehearsal.date),
    ]),
  );

  const confirmed = rows.filter((row) => row.seat === "Confirmed").length;
  const offered = rows.filter((row) => row.seat === "Offered").length;

  return (
    <>
      <header className="portal-topbar">
        <h1>{showDate.show.title}</h1>
        <div className="button-row">
          {member.role === "ADMIN" && (
            <Link
              className="button button-small button-ghost"
              href={`/admin/show-dates/${showDate.id}`}
            >
              Edit show date
            </Link>
          )}
          <Link className="button button-small button-ghost" href="/admin/casting">
            All boards
          </Link>
        </div>
      </header>
      <div className="portal-content">
        <section className="portal-panel">
          <dl className="portal-detail-list">
            <div>
              <dt>When</dt>
              <dd>{formatDateTime(showDate.date)}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{showDate.location ?? "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className="portal-pill"
                  data-tone={showDate.status.toLowerCase()}
                >
                  {SHOW_DATE_STATUS_LABELS[showDate.status]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Casting</dt>
              <dd>{castingStatusLabel(rows.length, confirmed, offered)}</dd>
            </div>
            <div>
              <dt>Director</dt>
              <dd>
                {showDate.director ? displayName(showDate.director) : "Not assigned"}
              </dd>
            </div>
            <div>
              <dt>Tech rehearsal</dt>
              <dd>
                {showDate.techDate ? formatDateTime(showDate.techDate) : "None"}
              </dd>
            </div>
          </dl>
        </section>

        <p className="page-intro">
          Offering a seat sends it to the performer to accept. Nobody is cast until
          they confirm, and each performer can hold only one role per performance.
        </p>

        {rows.length ? (
          <div className="admin-board">
            {rows.map(({ role, seat, assignment, interested }) => {
              const applicants = interested
                .filter(
                  (interest) => interest.performerId !== assignment?.performerId,
                )
                .map((interest) => ({
                  performerId: interest.performerId,
                  name: displayName(interest.performer),
                  questions: interest.questions,
                  conflicts: [
                    ...interest.conflictRehearsalIds.map(
                      (id) => rehearsalLabels.get(id) ?? "A rehearsal",
                    ),
                    ...(interest.conflictTech ? ["Tech rehearsal"] : []),
                  ],
                }));

              return (
                <article className="admin-board-role" key={role.id}>
                  <header>
                    <div>
                      <h2>{role.name}</h2>
                      <small>
                        {role.gender} · {role.age}
                      </small>
                    </div>
                    <span className="portal-pill" data-tone={seat.toLowerCase()}>
                      {seat}
                    </span>
                  </header>

                  {assignment ? (
                    <div className="admin-board-seat">
                      <p>
                        <strong>{displayName(assignment.performer)}</strong>
                        <br />
                        <small>
                          {seat === "Confirmed"
                            ? "Confirmed this role."
                            : "Waiting on their answer."}
                        </small>
                      </p>
                      <WithdrawControls
                        confirmed={seat === "Confirmed"}
                        roleId={role.id}
                        showDateId={showDate.id}
                      />
                    </div>
                  ) : (
                    <OfferControls
                      applicants={applicants}
                      roleId={role.id}
                      showDateId={showDate.id}
                    />
                  )}

                  {applicants.length > 0 && (
                    <details className="admin-board-applicants">
                      <summary>
                        {applicants.length}{" "}
                        {applicants.length === 1 ? "applicant" : "applicants"}
                      </summary>
                      <ul>
                        {applicants.map((applicant) => (
                          <li key={applicant.performerId}>
                            <strong>{applicant.name}</strong>
                            {applicant.conflicts.length > 0 && (
                              <p className="admin-board-conflict">
                                Cannot make: {applicant.conflicts.join(", ")}
                              </p>
                            )}
                            {applicant.questions && <p>“{applicant.questions}”</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>This show has no roles</strong>
            <p>
              Add characters under{" "}
              <Link href={`/admin/catalog/${showDate.show.slug}`}>
                {showDate.show.title}
              </Link>{" "}
              before casting it.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
