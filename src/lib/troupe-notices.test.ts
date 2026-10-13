import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { troupeInviteOpening } from "@/lib/email";
import { accessGrantForInvite } from "@/lib/show-access";
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

describe("performer show access", () => {
  it("limits a performer to the invited shows and leaves an administrator open", () => {
    assert.deepEqual(accessGrantForInvite("PERFORMER", ["show-a"]), {
      restricted: true,
      showIds: ["show-a"],
    });
    assert.deepEqual(accessGrantForInvite("ADMIN", ["show-a"]), {
      restricted: false,
      showIds: [],
    });
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
