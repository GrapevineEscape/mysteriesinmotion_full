import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkOffer,
  checkOfferResponse,
  seatState,
  withdrawalNotice,
  type OfferState,
} from "@/lib/casting-rules";

function offerState(overrides: Partial<OfferState> = {}): OfferState {
  return {
    role: { name: "Vivian Crane" },
    seatForRole: null,
    hasInterest: true,
    performerActiveSeat: null,
    ...overrides,
  };
}

describe("offering a seat", () => {
  it("allows an offer to an interested performer for an open seat", () => {
    assert.deepEqual(checkOffer(offerState()), { ok: true });
  });

  it("refuses a role that belongs to a different show", () => {
    const decision = checkOffer(offerState({ role: null }));
    assert.equal(decision.ok, false);
  });

  it("refuses a performer who never opted in for the role", () => {
    const decision = checkOffer(offerState({ hasInterest: false }));
    assert.equal(decision.ok, false);
    assert.match(decision.ok ? "" : decision.message, /opt in/);
  });

  it("refuses a seat that is already offered to someone", () => {
    const decision = checkOffer(
      offerState({ seatForRole: { status: "OFFERED" } }),
    );
    assert.equal(decision.ok, false);
    assert.match(decision.ok ? "" : decision.message, /already filled or offered/);
  });

  it("refuses a second seat on the same date for one performer", () => {
    const decision = checkOffer(
      offerState({ performerActiveSeat: { roleName: "The Butler" } }),
    );
    assert.equal(decision.ok, false);
    assert.match(decision.ok ? "" : decision.message, /The Butler/);
  });
});

describe("responding to an offer", () => {
  it("accepts an outstanding offer", () => {
    assert.deepEqual(checkOfferResponse({ status: "OFFERED" }), { ok: true });
  });

  it("refuses to respond twice", () => {
    const decision = checkOfferResponse({ status: "CONFIRMED" });
    assert.equal(decision.ok, false);
  });

  it("refuses when the offer was withdrawn before the performer replied", () => {
    const decision = checkOfferResponse(null);
    assert.equal(decision.ok, false);
  });
});

describe("withdrawing a seat", () => {
  it("distinguishes retracting an offer from removing a confirmed performer", () => {
    assert.deepEqual(withdrawalNotice({ status: "OFFERED", roleName: "Vivian" }), {
      ok: true,
      wasConfirmed: false,
    });
    assert.deepEqual(
      withdrawalNotice({ status: "CONFIRMED", roleName: "Vivian" }),
      { ok: true, wasConfirmed: true },
    );
  });

  it("refuses when there is nothing to withdraw", () => {
    assert.equal(withdrawalNotice(null).ok, false);
  });
});

describe("seat state", () => {
  it("maps an assignment to the label the board shows", () => {
    assert.equal(seatState(null), "Open");
    assert.equal(seatState({ status: "OFFERED" }), "Offered");
    assert.equal(seatState({ status: "CONFIRMED" }), "Confirmed");
  });
});
