import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteRole, deleteShow } from "../actions";
import { ShowForm } from "../show-form";
import { RoleEditor } from "./role-editor";

export const metadata: Metadata = { title: "Edit show" };

export default async function EditShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const show = await db.show.findUnique({
    where: { slug },
    include: {
      roles: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] },
      _count: { select: { showDates: true, bookings: true } },
    },
  });
  if (!show) notFound();

  const isLive = show.type !== "ONLINE";

  return (
    <>
      <header className="portal-topbar">
        <h1>{show.title}</h1>
        <div className="button-row">
          {show.type === "ONLINE" && (
            <Link
              className="button button-small button-ghost"
              href={`/admin/shows/${show.slug}`}
            >
              Case configuration
            </Link>
          )}
          <Link className="button button-small button-ghost" href="/admin/catalog">
            Back to catalog
          </Link>
        </div>
      </header>
      <div className="portal-content">
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Details</h2>
          </div>
          <ShowForm show={show} />
        </section>

        {isLive && (
          <section className="portal-panel">
            <div className="portal-panel-heading">
              <h2>Roles</h2>
            </div>
            <p className="page-intro">
              Roles drive both the public show page and casting. Performers apply
              against these, so renaming one keeps its applications intact.
            </p>

            {show.roles.length ? (
              <ul className="portal-list admin-role-list">
                {show.roles.map((role) => (
                  <li key={role.id}>
                    <div>
                      <strong>{role.name}</strong>
                      <small>
                        {role.gender} · {role.age}
                      </small>
                      {role.description && <p>{role.description}</p>}
                    </div>
                    <div className="button-row">
                      <RoleEditor role={role} showId={show.id} />
                      <form action={deleteRole}>
                        <input name="roleId" type="hidden" value={role.id} />
                        <button className="button button-small button-danger" type="submit">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty-state">
                <strong>No roles yet</strong>
                <p>Add the characters performers can play.</p>
              </div>
            )}

            <RoleEditor showId={show.id} />
          </section>
        )}

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Remove this show</h2>
          </div>
          {show._count.bookings > 0 ? (
            <p className="page-intro">
              This show has {show._count.bookings} booking{" "}
              {show._count.bookings === 1 ? "enquiry" : "enquiries"} on record, so
              it cannot be deleted. Set its status to Archived to take it off the
              website while keeping the history.
            </p>
          ) : (
            <>
              <p className="page-intro">
                Deleting removes its roles
                {show._count.showDates > 0
                  ? `, ${show._count.showDates} scheduled performance${
                      show._count.showDates === 1 ? "" : "s"
                    }, and all casting against them`
                  : ""}
                . Archiving is usually the better choice.
              </p>
              <form action={deleteShow}>
                <input name="id" type="hidden" value={show.id} />
                <button className="button button-danger" type="submit">
                  Delete permanently
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
