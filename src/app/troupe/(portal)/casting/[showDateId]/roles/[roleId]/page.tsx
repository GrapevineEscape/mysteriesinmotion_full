import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { applyAutoClose, isCastingOpen } from "@/lib/show-date-lifecycle";
import { saveApplication, withdrawApplication } from "../../actions";

type PageProps = {
  params: Promise<{ showDateId: string; roleId: string }>;
};

export const metadata: Metadata = { title: "Apply" };

export default async function CastingApplyPage({ params }: PageProps) {
  const member = await requireTroupe();
  const { showDateId, roleId } = await params;
  await applyAutoClose();

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: { show: true, rehearsals: { orderBy: { date: "asc" } } },
  });
  if (!showDate) notFound();
  if (!isCastingOpen(showDate)) redirect("/troupe/casting");

  const role = await db.role.findFirst({
    where: { id: roleId, showId: showDate.showId },
  });
  if (!role) notFound();

  // Someone else already holds this part; there is nothing to apply for.
  const seat = await db.showDateAssignment.findUnique({
    where: { showDateId_roleId: { showDateId, roleId } },
  });
  if (seat?.status === "CONFIRMED") redirect(`/troupe/casting/${showDateId}`);

  const application = await db.showDateInterest.findUnique({
    where: {
      showDateId_roleId_performerId: {
        showDateId,
        roleId,
        performerId: member.id,
      },
    },
  });
  const conflicts = new Set(application?.conflictRehearsalIds ?? []);

  return (
    <>
      <header className="portal-topbar">
        <h1>{application ? "Edit application" : "I am interested"}</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          <Link href={`/troupe/casting/${showDate.id}`}>
            ← Back to {showDate.show.title}
          </Link>
        </p>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>{role.name}</h2>
            <span className="portal-pill">{showDate.show.title}</span>
          </div>
          <p className="muted">
            {formatDateTime(showDate.date)}
            {showDate.location ? ` · ${showDate.location}` : ""}
          </p>
          <p>{role.description}</p>
        </section>

        <section className="portal-panel">
          <div className="portal-callout">
            <strong>How casting works</strong>
            <p>
              Applying means you are interested in this role for this
              performance. Casting is decided on fit, availability, prior
              experience, and what the troupe needs, not on who applied first.
              Flagging a conflict does not count against you; it helps us plan.
            </p>
            <p>
              You may apply for more than one role in the same show. After you
              submit, go back and choose another open role.
            </p>
          </div>

          <form action={saveApplication} className="portal-form">
            <input name="showDateId" type="hidden" value={showDate.id} />
            <input name="roleId" type="hidden" value={role.id} />

            <h3>Schedule — mark any conflicts</h3>
            <p className="muted">
              Check anything you cannot attend. You can still apply.
            </p>

            {showDate.rehearsals.length ? (
              showDate.rehearsals.map((rehearsal) => (
                <label className="portal-checkbox" key={rehearsal.id}>
                  <input
                    defaultChecked={conflicts.has(rehearsal.id)}
                    name="conflictRehearsalId"
                    type="checkbox"
                    value={rehearsal.id}
                  />
                  <span>
                    <strong>Conflict:</strong> {formatDateTime(rehearsal.date)}
                    <span className="muted"> · {rehearsal.location}</span>
                  </span>
                </label>
              ))
            ) : (
              <p className="muted">No regular rehearsals listed yet.</p>
            )}

            {showDate.techDate && (
              <label className="portal-checkbox">
                <input
                  defaultChecked={application?.conflictTech ?? false}
                  name="conflictTech"
                  type="checkbox"
                  value="1"
                />
                <span>
                  <strong>Conflict — tech:</strong>{" "}
                  {formatDateTime(showDate.techDate)}
                  <span className="muted">
                    {" "}
                    · {showDate.techLocation ?? showDate.location ?? "—"}
                  </span>
                </span>
              </label>
            )}

            <label>
              <span>Questions or notes for the director</span>
              <textarea
                defaultValue={application?.questions ?? ""}
                name="questions"
                placeholder="Anything we should know?"
                rows={4}
              />
            </label>

            <div className="button-row">
              <Link
                className="button button-ghost"
                href={`/troupe/casting/${showDate.id}`}
              >
                Cancel
              </Link>
              <button className="button button-primary" type="submit">
                {application ? "Save changes" : "Apply to perform"}
              </button>
            </div>
          </form>

          {application && (
            <form action={withdrawApplication} className="portal-form-inline">
              <input name="showDateId" type="hidden" value={showDate.id} />
              <input name="roleId" type="hidden" value={role.id} />
              <button className="button button-small button-ghost" type="submit">
                Withdraw this application
              </button>
              <small className="muted">
                Removes you from consideration for {role.name} on this date.
              </small>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
