import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { troupeInviteOpening } from "@/lib/email";
import { escapeNoticeText } from "@/lib/troupe-notices";

describe("troupe invitation", () => {
  it("names administrator access and leaves performer access unlabelled", () => {
    assert.equal(
      troupeInviteOpening("ADMIN"),
      "You have been invited to join the Mysteries in Motion troupe portal as an Administrator.",
    );
    assert.equal(
      troupeInviteOpening("PERFORMER"),
      "You have been invited to join the Mysteries in Motion troupe portal.",
    );
  });
});

describe("troupe notice text", () => {
  it("escapes names that could break the email", () => {
    assert.equal(
      escapeNoticeText(`Vivian <Crane> & "guest"`),
      "Vivian &lt;Crane&gt; &amp; &quot;guest&quot;",
    );
  });
});
