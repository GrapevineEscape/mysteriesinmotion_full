import type { Metadata } from "next";
import Link from "next/link";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/app-time";
import { displayName } from "@/lib/people";
import { ApplicationTable } from "./application-table";

export const metadata: Metadata = { title: "Roster requests" };

const STATUS_FILTERS: { value: ApplicationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Awaiting review" },
  { value: "APPROVED", label: "On the roster" },
  { value: "REJECTED", label: "Declined" },
  { value: "ALL", label: "Everything" },
];

function isStatus(value: string | undefined): value is ApplicationStatus {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED";
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; show?: string }>;
}) {
  await requireAdmin();
  const { status, show: showFilter } = await searchParams;

  const activeStatus = status === "ALL" ? "ALL" : isStatus(status) ? status : "PENDING";
  const where: Prisma.RoleApplicationWhereInput = {
    ...(activeStatus === "ALL" ? {} : { status: activeStatus }),
    ...(showFilter ? { show: { slug: showFilter } } : {}),
  };

  const [applications, shows] = await Promise.all([
    db.roleApplication.findMany({
      where,
      include: { performer: true, role: true, show: true },
      orderBy: { appliedAt: "desc" },
    }),
    db.show.findMany({
      where: { roleApplications: { some: {} } },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  const rows = applications.map((application) => ({
    id: application.id,
    performer: displayName(application.performer),
    performerEmail: application.performer.email,
    role: application.role.name,
    show: application.show.title,
    showSlug: application.show.slug,
    status: application.status,
    appliedAt: formatDate(application.appliedAt),
  }));

  return (
    <>
      <header className="portal-topbar">
        <h1>Roster requests</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Performers say which characters they would play. Approving one puts them
          on the roster for that role, which is who you can offer a seat to when
          casting a performance.
        </p>

        <div className="portal-filter-bar">
          <div className="portal-filter-group">
            {STATUS_FILTERS.map((filter) => {
              const params = new URLSearchParams();
              params.set("status", filter.value);
              if (showFilter) params.set("show", showFilter);
              return (
                <Link
                  aria-current={activeStatus === filter.value ? "true" : undefined}
                  href={`/admin/applications?${params}`}
                  key={filter.value}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>

          {shows.length > 1 && (
            <div className="portal-filter-group">
              <Link
                aria-current={!showFilter ? "true" : undefined}
                href={`/admin/applications?status=${activeStatus}`}
              >
                All shows
              </Link>
              {shows.map((show) => (
                <Link
                  aria-current={showFilter === show.slug ? "true" : undefined}
                  href={`/admin/applications?status=${activeStatus}&show=${show.slug}`}
                  key={show.slug}
                >
                  {show.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {rows.length ? (
          <ApplicationTable rows={rows} />
        ) : (
          <div className="admin-empty-state">
            <strong>Nothing here</strong>
            <p>
              {activeStatus === "PENDING"
                ? "Every roster request has been reviewed."
                : "No requests match this filter."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
