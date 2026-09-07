import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultLandingPath,
  isTroupeReturnPath,
  signInHref,
} from "./auth";

describe("sign-in doors", () => {
  it("sends play and troupe to different pages", () => {
    assert.equal(signInHref("play"), "/sign-in");
    assert.equal(signInHref("troupe"), "/troupe/sign-in");
    assert.equal(
      signInHref("troupe", "/admin/bookings"),
      "/troupe/sign-in?next=%2Fadmin%2Fbookings",
    );
  });

  it("treats administration and the portal as troupe return paths", () => {
    assert.equal(isTroupeReturnPath("/troupe"), true);
    assert.equal(isTroupeReturnPath("/troupe/calendar"), true);
    assert.equal(isTroupeReturnPath("/admin"), true);
    assert.equal(isTroupeReturnPath("/admin/bookings"), true);
    assert.equal(isTroupeReturnPath("/my-cases"), false);
    assert.equal(isTroupeReturnPath("/mysteries"), false);
    assert.equal(isTroupeReturnPath("https://evil.example"), false);
  });

  it("keeps play sign-in on the case files even for staff", () => {
    assert.equal(defaultLandingPath("ADMIN", "play"), "/my-cases");
    assert.equal(defaultLandingPath("PERFORMER", "play"), "/my-cases");
    assert.equal(defaultLandingPath("CUSTOMER", "play"), "/my-cases");
  });

  it("sends troupe sign-in to the portal", () => {
    assert.equal(defaultLandingPath("ADMIN", "troupe"), "/admin");
    assert.equal(defaultLandingPath("PERFORMER", "troupe"), "/troupe");
    assert.equal(defaultLandingPath("CUSTOMER", "troupe"), "/my-cases");
  });
});
