import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/app-time";
import { displayName, nameSortKey } from "@/lib/people";
import { deleteRehearsal } from "../actions";
import { DeleteShowDate } from "./delete-show-date";
import { RehearsalEditor } from "./rehearsal-editor";
import { ShowDateForm } from "./show-date-form";

export const metadata: Metadata = { title: "Edit show date" };

export default async function EditShowDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ showDateId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [{ showDateId }, { error }] = await Promise.all([params, searchParams]);

  const showDate = await db.showDate.findUnique({
    where: { id: showDateId },
    include: {
      show: { select: { title: true, slug: true } },
      rehearsals: { orderBy: { date: "asc" } },
      assignments: { include: { performer: true, role: true } },
      _count: { select: { interests: true } },
    },
  });
  if (!showDate) notFound();

  const troupe = await db.user.findMany({
    where: { role: { in: ["PERFORMER", "ADMIN"] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const directors = troupe
    .map((member) => ({
      id: member.id,
      label: displayName(member),
      sortKey: nameSortKey(member),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <>
      <header className="portal-topbar">
        <h1>{showDate.show.title}</h1>
        <div className="button-row">
          <Link
            className="button button-small button-primary"
            href={`/admin/casting/${showDate.id}`}
          >
            Casting board
          </Link>
          <Link className="button button-small button-ghost" href="/admin/show-dates">
            All show dates
          </Link>
        </div>
      </header>
      <div className="portal-content">
        {error === "confirmation" && (
          <div className="admin-alert admin-alert-error" role="alert">
            Nothing was deleted. Type DELETE exactly to confirm.
          </div>
        )}

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Performance details</h2>
          </div>
          <ShowDateForm
            directors={directors}
            showDate={{
              id: showDate.id,
              date: toLocalDateTimeInput(showDate.date),
              location: showDate.location ?? "",
              status: showDate.status,
              customer: showDate.customer ?? "",
              attendees: showDate.attendees,
              notes: showDate.notes ?? "",
              directorId: showDate.directorId,
              techDate: toLocalDateTimeInput(showDate.techDate),
              techLocation: showDate.techLocation ?? "",
            }}
          />
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Rehearsals</h2>
          </div>
          {showDate.rehearsals.length ? (
            <ul className="portal-list">
              {showDate.rehearsals.map((rehearsal) => (
                <li key={rehearsal.id}>
                  <div>
                    <strong>{formatDateTime(rehearsal.date)}</strong>
                    <small>{rehearsal.location || "Location to be set"}</small>
                    {rehearsal.notes && <p>{rehearsal.notes}</p>}
                  </div>
                  <div className="button-row">
                    <RehearsalEditor
                      rehearsal={{
                        id: rehearsal.id,
                        date: toLocalDateTimeInput(rehearsal.date),
                        location: rehearsal.location ?? "",
                        notes: rehearsal.notes ?? "",
                      }}
                      showDateId={showDate.id}
                    />
                    <form action={deleteRehearsal}>
                      <input name="rehearsalId" type="hidden" value={rehearsal.id} />
                      <button
                        className="button button-small button-danger"
                        type="submit"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-empty-state">
              <strong>No rehearsals scheduled</strong>
              <p>Performers will see any you add here when they apply.</p>
            </div>
          )}
          <RehearsalEditor
            defaultLocation={showDate.location ?? ""}
            showDateId={showDate.id}
          />
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Remove this show date</h2>
          </div>
          <DeleteShowDate
            seatCount={showDate.assignments.length}
            showDateId={showDate.id}
          />
        </section>
      </div>
    </>
  );
}
