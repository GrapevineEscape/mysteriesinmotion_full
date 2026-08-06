import type { Metadata } from "next";
import Link from "next/link";
import type { ShowType } from "@prisma/client";
import { db } from "@/lib/db";
import { SHOW_TYPE_LABELS, isShowType } from "@/lib/show-types";

export const metadata: Metadata = { title: "Shows" };

export default async function TroupeShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const selectedType: ShowType | null = isShowType(type) ? type : null;

  const shows = await db.show.findMany({
    where: selectedType ? { type: selectedType } : undefined,
    orderBy: { title: "asc" },
    include: { _count: { select: { roles: true } } },
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Shows</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Browse productions, read the roles, and open scripts. For booked
          performances, use <Link href="/troupe/casting">Show dates</Link>.
        </p>

        <section className="portal-panel">
          <form action="/troupe/shows" className="portal-filter-bar" method="get">
            <label>
              <span>Type</span>
              <select defaultValue={selectedType ?? ""} name="type">
                <option value="">All types</option>
                {Object.entries(SHOW_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button-small button-primary" type="submit">
              Filter
            </button>
            {selectedType && (
              <Link className="button button-small button-ghost" href="/troupe/shows">
                Reset
              </Link>
            )}
          </form>

          {shows.length ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Kid-friendly</th>
                    <th>Description</th>
                    <th>Roles</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => (
                    <tr key={show.id}>
                      <td>
                        <strong>{show.title}</strong>
                      </td>
                      <td>{SHOW_TYPE_LABELS[show.type]}</td>
                      <td>{show.kidFriendly ? "Yes" : "No"}</td>
                      <td className="portal-cell-prose">{show.shortDescription}</td>
                      <td>{show._count.roles}</td>
                      <td>
                        <div className="button-row">
                          <Link
                            className="button button-small button-primary"
                            href={`/troupe/shows/${show.slug}`}
                          >
                            Show roles
                          </Link>
                          {show.scriptUrl && (
                            <Link
                              className="button button-small button-ghost"
                              href={`/troupe/shows/${show.slug}/script`}
                              rel="noopener"
                              target="_blank"
                            >
                              Script
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>No shows match</strong>
              <p>
                {selectedType
                  ? "Try another type, or reset the filter."
                  : "Check back once administration publishes productions."}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
