/**
 * US phone helpers. Accepts the formats people actually type and stores a
 * single canonical form, XXX-XXX-XXXX.
 */

export class InvalidPhoneError extends Error {
  constructor() {
    super(
      "Enter a valid 10-digit US phone number, such as 214-213-8719, (214) 213-8719, or 2142138719.",
    );
    this.name = "InvalidPhoneError";
  }
}

export function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Returns XXX-XXX-XXXX for a valid US number, or null when the input is blank.
 * Throws InvalidPhoneError when a value is present but is not a US number.
 */
export function normalizeUsPhone(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let digits = digitsOnly(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) throw new InvalidPhoneError();

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Normalizes without throwing, for display paths where invalid input is fine. */
export function formatUsPhone(value: string | null | undefined) {
  try {
    return normalizeUsPhone(value);
  } catch {
    return value?.trim() || null;
  }
}
