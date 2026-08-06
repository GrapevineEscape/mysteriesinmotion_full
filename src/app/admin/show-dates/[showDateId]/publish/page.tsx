import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { displayName } from "@/lib/people";
import { WizardSteps } from "@/components/admin/wizard-steps";
import { publishShowDate } from "../../actions";
import { requireDraftShowDate } from "../wizard-data";

export const metadata: Metadata = { title: "Publish the performance" };

export default async function WizardPublishPage({
  params,
}: {
  params: Promise<{ showDateId: string }>;
}) {
  const { showDateId } = await params;
  const showDate = await requireDraftShowDate(showDateId);

  const roles = await db.role.findMany({
    where: { showId: showDate.show.id },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  const seatByRole = new Map(
    showDate.assignments.map((seat) => [seat.roleId, seat]),
  );
  const openRoles = roles.filter((role) => !seatByRole.has(role.id));

  return (
    <>
      <header className="portal-topbar">
        <h1>{showDate.show.title}</h1>
        <Link className="button button-small button-ghost" href="/admin/show-dates">
          Save and exit
        </Link>
      </header>
      <div className="portal-content">
        <WizardSteps current="publish" />

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Ready to open casting</h2>
          </div>

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
              <dt>Customer</dt>
              <dd>{showDate.customer ?? "—"}</dd>
            </div>
            <div>
              <dt>Director</dt>
              <dd>
                {showDate.director ? displayName(showDate.director) : "Not assigned"}
              </dd>
            </div>
            <div>
              <dt>Rehearsals</dt>
              <dd>
                {showDate.rehearsals.length
                  ? showDate.rehearsals
                      .map((rehearsal) => formatDateTime(rehearsal.date))
                      .join(", ")
                  : "None scheduled"}
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

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Cast so far</h2>
          </div>
          {roles.length ? (
            <ul className="portal-list">
              {roles.map((role) => {
                const seat = seatByRole.get(role.id);
                return (
                  <li key={role.id}>
                    <div>
                      <strong>{role.name}</strong>
                      <small>
                        {seat
                          ? `${displayName(seat.performer)} · confirmed`
                          : "Open for performers to put themselves forward"}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="page-intro">
              This show has no roles yet, so there is nothing for performers to
              apply to. You can still open the date and add roles later.
            </p>
          )}
        </section>

        <section className="portal-panel">
          <p className="page-intro">
            Opening casting makes this performance visible to the troupe.{" "}
            {openRoles.length
              ? `${openRoles.length} ${openRoles.length === 1 ? "role is" : "roles are"} open for performers to put themselves forward.`
              : "Every role is already cast, so nobody needs to apply."}{" "}
            Performers are not emailed automatically yet, so tell them it is up.
          </p>
          <form action={publishShowDate}>
            <input name="showDateId" type="hidden" value={showDate.id} />
            <div className="button-row">
              <button className="button button-primary" type="submit">
                Open casting
              </button>
              <button
                className="button button-ghost"
                name="action"
                type="submit"
                value="draft"
              >
                Keep as draft
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
