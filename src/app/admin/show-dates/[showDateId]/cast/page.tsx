import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/app-time";
import { rosterByRole } from "@/lib/casting";
import { displayName } from "@/lib/people";
import { WizardSteps } from "@/components/admin/wizard-steps";
import { castablePerformers, requireDraftShowDate } from "../wizard-data";
import { CastForm } from "./cast-form";

export const metadata: Metadata = { title: "Cast the performance" };

export default async function WizardCastPage({
  params,
}: {
  params: Promise<{ showDateId: string }>;
}) {
  const { showDateId } = await params;
  const showDate = await requireDraftShowDate(showDateId);

  const [roles, roster, performers] = await Promise.all([
    db.role.findMany({
      where: { showId: showDate.show.id },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    rosterByRole(showDate.show.id),
    castablePerformers(),
  ]);

  const assignedByRole = new Map(
    showDate.assignments.map((seat) => [seat.roleId, seat.performerId]),
  );

  return (
    <>
      <header className="portal-topbar">
        <h1>{showDate.show.title}</h1>
        <Link className="button button-small button-ghost" href="/admin/show-dates">
          Save and exit
        </Link>
      </header>
      <div className="portal-content">
        <WizardSteps current="cast" />

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Pre-cast anyone you already know</h2>
          </div>
          <p className="page-intro">
            {formatDateTime(showDate.date)} at {showDate.location ?? "a venue to be set"}.
            Anyone you pick here is confirmed straight away. Roles you leave open
            are the ones performers can put themselves forward for once you
            publish.
          </p>

          {roles.length ? (
            <CastForm
              performers={performers}
              roles={roles.map((role) => ({
                id: role.id,
                name: role.name,
                gender: role.gender,
                age: role.age,
                assignedPerformerId: assignedByRole.get(role.id) ?? null,
                roster: (roster.get(role.id) ?? []).map((application) => ({
                  id: application.performerId,
                  label: displayName(application.performer),
                })),
              }))}
              showDateId={showDate.id}
            />
          ) : (
            <div className="admin-empty-state">
              <strong>This show has no roles yet</strong>
              <p>
                Add characters under{" "}
                <Link href={`/admin/catalog/${showDate.show.slug}`}>
                  {showDate.show.title}
                </Link>
                , then come back. You can carry on to rehearsals in the meantime.
              </p>
              <Link
                className="button button-primary"
                href={`/admin/show-dates/${showDate.id}/rehearsals`}
              >
                Continue to rehearsals
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
