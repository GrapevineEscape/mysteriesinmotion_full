import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicOrigin } from "@/lib/public-origin";

describe("public origin", () => {
  it("ignores the internal Render listener", () => {
    const request = new Request("https://localhost:10000/api/auth/sign-out", {
      headers: {
        "x-forwarded-host": "mysteriesinmotion.com",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(publicOrigin(request), "https://mysteriesinmotion.com");
  });

  it("keeps a local dev server on http", () => {
    const request = new Request("http://localhost:3000/api/auth/sign-out");
    assert.equal(publicOrigin(request), "http://localhost:3000");
  });
});
