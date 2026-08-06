import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/app-time";
import { formatUsPhone } from "@/lib/phone";
import { confirmBooking, setBookingStatus } from "./actions";

export const metadata: Metadata = { title: "Booking enquiries" };

const STATUS_FILTERS: { value: BookingStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "To answer" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REJECTED", label: "Declined" },
  { value: "ALL", label: "Everything" },
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "To answer",
  CONFIRMED: "Confirmed",
  REJECTED: "Declined",
};

function isStatus(value: string | undefined): value is BookingStatus {
  return value === "PENDING" || value === "CONFIRMED" || value === "REJECTED";
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const active = status === "ALL" ? "ALL" : isStatus(status) ? status : "PENDING";

  const bookings = await db.booking.findMany({
    where: active === "ALL" ? {} : { status: active },
    include: { show: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <header className="portal-topbar">
        <h1>Booking enquiries</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Enquiries from the website. Confirming one opens a draft performance with
          the customer&rsquo;s date and party size already filled in, ready for you
          to set the venue and cast it.
        </p>

        <div className="portal-filter-bar">
          <div className="portal-filter-group">
            {STATUS_FILTERS.map((filter) => (
              <Link
                aria-current={active === filter.value ? "true" : undefined}
                href={`/admin/bookings?status=${filter.value}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        {bookings.length ? (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Show</th>
                  <th>Preferred date</th>
                  <th>Guests</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.name}</strong>
                      <br />
                      <small>
                        <a href={`mailto:${booking.email}`}>{booking.email}</a>
                        {" · "}
                        <a href={`tel:${booking.phone}`}>
                          {formatUsPhone(booking.phone)}
                        </a>
                      </small>
                      {booking.message && <p>{booking.message}</p>}
                    </td>
                    <td>
                      <Link href={`/shows/${booking.show.slug}`}>
                        {booking.show.title}
                      </Link>
                    </td>
                    <td>{formatDate(booking.preferredDate)}</td>
                    <td>{booking.guestCount}</td>
                    <td>{formatDate(booking.createdAt)}</td>
                    <td>
                      <span
                        className="portal-pill"
                        data-tone={booking.status.toLowerCase()}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </td>
                    <td>
                      <div className="button-row">
                        {booking.status !== "CONFIRMED" && (
                          <form action={confirmBooking}>
                            <input
                              name="bookingId"
                              type="hidden"
                              value={booking.id}
                            />
                            <button
                              className="button button-small button-primary"
                              type="submit"
                            >
                              Confirm and schedule
                            </button>
                          </form>
                        )}
                        {booking.status !== "REJECTED" && (
                          <form
                            action={setBookingStatus.bind(
                              null,
                              "REJECTED",
                              booking.id,
                            )}
                          >
                            <button
                              className="button button-small button-ghost"
                              type="submit"
                            >
                              Decline
                            </button>
                          </form>
                        )}
                        {booking.status !== "PENDING" && (
                          <form
                            action={setBookingStatus.bind(
                              null,
                              "PENDING",
                              booking.id,
                            )}
                          >
                            <button
                              className="button button-small button-ghost"
                              type="submit"
                            >
                              Reopen
                            </button>
                          </form>
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
            <strong>Nothing here</strong>
            <p>
              {active === "PENDING"
                ? "Every enquiry has been answered."
                : "No enquiries match this filter."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
