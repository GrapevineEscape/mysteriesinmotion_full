import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUsPhone } from "@/lib/phone";
import { displayName, nameSortKey } from "@/lib/people";

export const metadata: Metadata = { title: "Performers" };

export default async function PerformersPage() {
  await requireAdmin();

  const performers = await db.user.findMany({
    where: { role: { in: ["PERFORMER", "ADMIN"] } },
    include: {
      _count: {
        select: {
          roleApplications: true,
          showDateAssignments: true,
          directedShowDates: true,
        },
      },
    },
  });

  const sorted = performers.sort((a, b) =>
    nameSortKey(a).localeCompare(nameSortKey(b)),
  );

  return (
    <>
      <header className="portal-topbar">
        <h1>Performers</h1>
        <Link className="button button-small button-ghost" href="/admin/troupe">
          Manage access
        </Link>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Everyone with troupe access. Profiles are theirs to maintain from their
          own portal; invitations and roles are handled under{" "}
          <Link href="/admin/troupe">Troupe access</Link>.
        </p>

        {sorted.length ? (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Roster</th>
                  <th>Cast in</th>
                  <th>Directing</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((performer) => (
                  <tr key={performer.id}>
                    <td>
                      <strong>{displayName(performer)}</strong>
                      {performer.role === "ADMIN" && (
                        <>
                          <br />
                          <span className="portal-pill" data-tone="admin">
                            admin
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {performer.email}
                      {performer.phone && (
                        <>
                          <br />
                          <small>{formatUsPhone(performer.phone)}</small>
                        </>
                      )}
                    </td>
                    <td>{performer._count.roleApplications}</td>
                    <td>{performer._count.showDateAssignments}</td>
                    <td>{performer._count.directedShowDates}</td>
                    <td>
                      <Link
                        className="button button-small button-ghost"
                        href={`/admin/performers/${performer.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Nobody has troupe access yet</strong>
            <p>
              Invite your performers from{" "}
              <Link href="/admin/troupe">Troupe access</Link>.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
