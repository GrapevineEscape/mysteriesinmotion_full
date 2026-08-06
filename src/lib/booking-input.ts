import { InvalidPhoneError, normalizeUsPhone } from "@/lib/phone";

export type BookingInput = {
  name: string;
  email: string;
  phone: string;
  showId: string;
  preferredDate: Date;
  guestCount: number;
  message: string | null;
};

export type BookingValidation =
  | { ok: true; value: BookingInput }
  | { ok: false; fieldErrors: Record<string, string> };

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function validateBookingInput(formData: FormData): BookingValidation {
  const fieldErrors: Record<string, string> = {};

  const name = readText(formData, "name");
  const email = readText(formData, "email");
  const showId = readText(formData, "showId");
  const preferredDateRaw = readText(formData, "preferredDate");
  const guestCountRaw = readText(formData, "guestCount");
  const message = readText(formData, "message");

  if (!name) {
    fieldErrors.name = "Enter your name.";
  } else if (name.length > 100) {
    fieldErrors.name = "Names are limited to 100 characters.";
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  let phone: string | null = null;
  try {
    phone = normalizeUsPhone(readText(formData, "phone"));
    if (!phone) fieldErrors.phone = "Enter a phone number.";
  } catch (error) {
    fieldErrors.phone =
      error instanceof InvalidPhoneError
        ? error.message
        : "Enter a valid phone number.";
  }

  if (!showId) fieldErrors.showId = "Choose a show.";

  // A preferred date is a plain calendar day, so it is anchored to UTC rather
  // than the server's zone, which would otherwise shift it by a day.
  const preferredDate = /^\d{4}-\d{2}-\d{2}$/.test(preferredDateRaw)
    ? new Date(`${preferredDateRaw}T00:00:00.000Z`)
    : null;
  if (!preferredDate || Number.isNaN(preferredDate.getTime())) {
    fieldErrors.preferredDate = "Choose a preferred date.";
  }

  const guestCount = Number(guestCountRaw);
  if (!guestCountRaw || !Number.isInteger(guestCount) || guestCount < 1) {
    fieldErrors.guestCount = "Enter how many guests you expect.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      name,
      email,
      phone: phone!,
      showId,
      preferredDate: preferredDate!,
      guestCount,
      message: message || null,
    },
  };
}
