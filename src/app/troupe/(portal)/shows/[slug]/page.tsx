import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedShowIds, canSeeShow } from "@/lib/show-access";
import { SHOW_TYPE_LABELS } from "@/lib/show-types";
import { RosterInterestButton } from "./roster-interest-button";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const show = await db.show.findUnique({
    where: { slug },
    select: { title: true },
  });
  return { title: show ? `Roles · ${show.title}` : "Roles" };
}

const STATUS_LABELS = {
  PENDING: "Pending review",
  APPROVED: "On roster",
  REJECTED: "Unavailable",
} as const;

export default async function TroupeShowRolesPage({ params }: PageProps) {
  const member = await requireTroupe();
  const { slug } = await params;

  const show = await db.show.findUnique({
    where: { slug },
    include: { roles: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
  });
  if (!show) notFound();
  const allowed = await allowedShowIds(member);
  if (!canSeeShow(allowed, show.id)) notFound();

  const applications = await db.roleApplication.findMany({
    where: { performerId: member.id, showId: show.id },
  });
  const statusByRole = new Map(applications.map((a) => [a.roleId, a.status]));

  return (
    <>
      <header className="portal-topbar">
        <h1>Future roles</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          <Link href="/troupe/shows">← Back to shows</Link> · Roles for{" "}
          <strong>{show.title}</strong> ({SHOW_TYPE_LABELS[show.type]})
        </p>

        <div className="portal-callout">
          <strong>I would play this role in the future</strong>
          <p>
            This does not cast you for a specific date. To join a booked
            performance, use <Link href="/troupe/casting">Show dates</Link>.
          </p>
        </div>

        <section className="portal-panel">
          {show.roles.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {show.roles.map((role) => {
                    const status = statusByRole.get(role.id);
                    return (
                      <tr key={role.id}>
                        <td>
                          <strong>{role.name}</strong>
                        </td>
                        <td>{role.gender}</td>
                        <td>{role.age}</td>
                        <td className="portal-cell-prose">{role.description}</td>
                        <td>
                          {status ? (
                            <span
                              className="portal-pill"
                              data-tone={status.toLowerCase()}
                            >
                              {STATUS_LABELS[status]}
                            </span>
                          ) : (
                            <RosterInterestButton
                              roleId={role.id}
                              roleName={role.name}
                            />
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
