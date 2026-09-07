"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Confirming a live enquiry starts a draft performance from it, so the
 * customer's date and party size carry into the setup wizard. Broadcast
 * enquiries have no live catalog title, so they are marked confirmed without
 * opening a ShowDate.
 */
export async function confirmBooking(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("bookingId") ?? "");

  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) redirect("/admin/bookings");

  if (!booking.showId) {
    await db.booking.update({ where: { id }, data: { status: "CONFIRMED" } });
    revalidatePath("/admin/bookings");
    redirect("/admin/bookings?status=CONFIRMED");
  }

  const showDate = await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status: "CONFIRMED" } });

    const existing = await tx.showDate.findFirst({
      where: { showId: booking.showId!, customer: booking.name, status: "DRAFT" },
      select: { id: true },
    });
    if (existing) return existing;

    return tx.showDate.create({
      data: {
        showId: booking.showId!,
        date: booking.preferredDate,
        customer: booking.name,
        attendees: booking.guestCount,
        notes: booking.message,
        status: "DRAFT",
        requiredRehearsals: 0,
      },
      select: { id: true },
    });
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/show-dates");
  redirect(`/admin/show-dates/${showDate.id}`);
}

export async function setBookingStatus(status: BookingStatus, id: string) {
  await requireAdmin();
  await db.booking.update({ where: { id }, data: { status } });
  revalidatePath("/admin/bookings");
}
