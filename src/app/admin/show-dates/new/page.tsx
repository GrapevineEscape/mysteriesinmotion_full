import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { displayName, nameSortKey } from "@/lib/people";

import { LIVE_SHOW_TYPES } from "@/lib/show-types";
import { WizardSteps } from "@/components/admin/wizard-steps";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Book a performance" };

export default async function NewShowDatePage() {
  await requireAdmin();

  const [shows, troupe] = await Promise.all([
    db.show.findMany({
      where: { type: { in: LIVE_SHOW_TYPES }, status: { not: "ARCHIVED" } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.user.findMany({
      where: { role: { in: ["PERFORMER", "ADMIN"] } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

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
        <h1>Book a performance</h1>
        <Link className="button button-small button-ghost" href="/admin/show-dates">
          Cancel
        </Link>
      </header>
      <div className="portal-content">
        <WizardSteps current="booking" />

        {shows.length ? (
          <section className="portal-panel">
            <p className="page-intro">
              Start with when and where. Casting and rehearsals come next, and
              nothing is visible to performers until you publish.
            </p>
            <BookingForm
              directors={directors}
              shows={shows.map((show) => ({ id: show.id, label: show.title }))}
            />
          </section>
        ) : (
          <div className="admin-empty-state">
            <strong>No live shows to book</strong>
            <p>
              Add a Standard or Escape show under{" "}
              <Link href="/admin/catalog">Shows and roles</Link> first.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
