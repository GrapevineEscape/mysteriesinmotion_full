import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBookingInput } from "./booking-input";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields = {
    name: "Dana Scully",
    email: "dana@example.com",
    phone: "(214) 213-8719",
    showId: "show_1",
    preferredDate: "2026-10-31",
    guestCount: "24",
    venue: "Private home in Plano",
    eventType: "Corporate",
    format: "live",
    message: "7pm start.",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("validateBookingInput", () => {
  it("accepts a complete request and folds venue into the message", () => {
    const result = validateBookingInput(form());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.phone, "214-213-8719");
    assert.equal(result.value.name, "Dana Scully");
    assert.equal(result.value.guestCount, 24);
    assert.match(result.value.message!, /Format: Live at your venue/);
    assert.match(result.value.message!, /Venue: Private home in Plano/);
    assert.match(result.value.message!, /Event type: Corporate/);
    assert.match(result.value.message!, /Notes: 7pm start\./);
  });

  it("keeps the preferred date on the day the customer chose", () => {
    const result = validateBookingInput(form({ preferredDate: "2026-10-31" }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.preferredDate.toISOString(), "2026-10-31T00:00:00.000Z");
  });

  it("still records venue when notes are omitted", () => {
    const result = validateBookingInput(form({ message: "   " }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.value.message!, /Venue:/);
    assert.doesNotMatch(result.value.message!, /Notes:/);
  });

  it("rejects a missing name", () => {
    const result = validateBookingInput(form({ name: "  " }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.name);
  });

  it("rejects a missing venue", () => {
    const result = validateBookingInput(form({ venue: "  " }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.venue);
  });

  it("rejects a malformed email address", () => {
    for (const email of ["dana", "dana@", "@example.com", "dana @example.com"]) {
      const result = validateBookingInput(form({ email }));
      assert.equal(result.ok, false, `accepted ${email}`);
    }
  });

  it("rejects a phone number that is not a US number", () => {
    const result = validateBookingInput(form({ phone: "555" }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.fieldErrors.phone!, /10-digit/);
  });

  it("rejects a guest count that is absent, zero, or fractional", () => {
    for (const guestCount of ["", "0", "-3", "2.5", "many"]) {
      const result = validateBookingInput(form({ guestCount }));
      assert.equal(result.ok, false, `accepted ${guestCount}`);
    }
  });

  it("rejects a malformed date", () => {
    for (const preferredDate of ["", "31-10-2026", "2026-13-45"]) {
      const result = validateBookingInput(form({ preferredDate }));
      assert.equal(result.ok, false, `accepted ${preferredDate}`);
    }
  });

  it("reports every problem at once rather than one at a time", () => {
    const result = validateBookingInput(
      form({
        name: "",
        email: "nope",
        phone: "12",
        guestCount: "0",
        venue: "",
        eventType: "",
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(Object.keys(result.fieldErrors).sort(), [
      "email",
      "eventType",
      "guestCount",
      "name",
      "phone",
      "venue",
    ]);
  });

  it("accepts a Broadcast enquiry without a show or venue", () => {
    const result = validateBookingInput(
      form({
        format: "broadcast",
        showId: "",
        venue: "",
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.showId, null);
    assert.match(result.value.message!, /Format: The Broadcast/);
    assert.match(result.value.message!, /Venue: online \/ none/);
  });

  it("still records an optional company location on a Broadcast enquiry", () => {
    const result = validateBookingInput(
      form({
        format: "broadcast",
        showId: "",
        venue: "Nationwide remote team",
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.value.message!, /Venue: Nationwide remote team/);
  });

  it("rejects a live request that is missing a show", () => {
    const result = validateBookingInput(form({ showId: "" }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.showId);
  });

  it("rejects a request with no format", () => {
    const result = validateBookingInput(form({ format: "" }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.format);
  });
});
