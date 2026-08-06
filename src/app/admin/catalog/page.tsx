import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SHOW_TYPE_LABELS } from "@/lib/show-types";

export const metadata: Metadata = { title: "Shows and roles" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const shows = await db.show.findMany({
    orderBy: [{ type: "asc" }, { displayOrder: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { roles: true, showDates: true, bookings: true } },
    },
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Shows and roles</h1>
        <Link className="button button-small button-primary" href="/admin/catalog/new">
          Add a show
        </Link>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Every production, live or online, in one catalog. Online mysteries also
          need their video and questions set up under{" "}
          <Link href="/admin/online">Case configuration</Link>.
        </p>

        {error === "bookings-exist" && (
          <div className="admin-alert admin-alert-error" role="alert">
            That show has booking inquiries attached, so it cannot be deleted.
            Archive it instead to take it off the website.
          </div>
        )}

        {shows.length ? (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Show</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Performances</th>
                  <th>Inquiries</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shows.map((show) => (
                  <tr key={show.id}>
                    <td>
                      <strong>{show.title}</strong>
                      <br />
                      <small>/{show.slug}</small>
                    </td>
                    <td>{SHOW_TYPE_LABELS[show.type]}</td>
                    <td>
                      <span
                        className="portal-pill"
                        data-tone={show.status.toLowerCase()}
                      >
                        {show.status.toLowerCase()}
                      </span>
                    </td>
                    <td>{show.type === "ONLINE" ? "—" : show._count.roles}</td>
                    <td>{show.type === "ONLINE" ? "—" : show._count.showDates}</td>
                    <td>{show._count.bookings}</td>
                    <td>
                      <Link
                        className="button button-small button-ghost"
                        href={`/admin/catalog/${show.slug}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>The catalog is empty</strong>
            <p>Add your first show to start taking bookings.</p>
          </div>
        )}
      </div>
    </>
  );
}
