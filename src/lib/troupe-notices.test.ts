import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeNoticeText } from "@/lib/troupe-notices";

describe("troupe notice text", () => {
  it("escapes names that could break the email", () => {
    assert.equal(
      escapeNoticeText(`Vivian <Crane> & "guest"`),
      "Vivian &lt;Crane&gt; &amp; &quot;guest&quot;",
    );
  });
});
