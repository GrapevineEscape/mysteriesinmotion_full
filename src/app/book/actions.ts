"use server";

import { validateBookingInput } from "@/lib/booking-input";
import { db } from "@/lib/db";
import { sendBookingNotification, sendBookingReceipt } from "@/lib/email";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";
import type { BookingFormState } from "./booking-state";

export async function requestBooking(
  _previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = validateBookingInput(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const show = await db.show.findFirst({
    where: { id: parsed.value.showId, type: { in: LIVE_SHOW_TYPES } },
    select: { id: true, title: true },
  });
  if (!show) {
    return {
      status: "error",
      message: "That show is no longer available. Please choose another.",
      fieldErrors: { showId: "Choose a show." },
    };
  }

  const booking = await db.booking.create({ data: parsed.value });

  // The Flask implementation saved the request and left notification as a TODO,
  // so enquiries only surfaced if somebody checked the database.
  try {
    await Promise.all([
      sendBookingNotification({ booking, showTitle: show.title }),
      sendBookingReceipt({ booking, showTitle: show.title }),
    ]);
  } catch (error) {
    // The request is safely recorded, so a mail failure must not tell the
    // customer their enquiry was lost.
    console.error("Booking notification failed", {
      bookingId: booking.id,
      error,
    });
  }

  return {
    status: "success",
    message:
      "Thank you for your booking request. We will contact you shortly to confirm the details.",
    fieldErrors: {},
  };
}
