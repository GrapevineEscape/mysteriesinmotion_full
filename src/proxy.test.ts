import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { SURFACE_HEADER } from "./lib/surface";

const APEX = "mysteriesinmotion.com";
const PLAY = "play.mysteriesinmotion.com";

function request(host: string, path: string) {
  return new NextRequest(`https://${host}${path}`, {
    headers: { host },
  });
}

/** The surface the proxy decided on, as seen by the app. */
function surfaceOf(response: Response) {
  return response.headers.get("x-middleware-request-" + SURFACE_HEADER);
}

/** Where a rewrite sent the request, if it rewrote at all. */
function rewriteTarget(response: Response) {
  const value = response.headers.get("x-middleware-rewrite");
  return value ? new URL(value).pathname : null;
}

function redirectTarget(response: Response) {
  const value = response.headers.get("location");
  return value ? new URL(value) : null;
}

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("host routing", () => {
  it("marks apex requests as the site surface", () => {
    const response = proxy(request(APEX, "/about"));
    assert.equal(surfaceOf(response), "site");
    assert.equal(rewriteTarget(response), null);
  });

  it("marks play subdomain requests as the play surface", () => {
    const response = proxy(request(PLAY, "/mysteries"));
    assert.equal(surfaceOf(response), "play");
  });

  it("treats play.localhost as the play surface during development", () => {
    const response = proxy(request("play.localhost", "/mysteries"));
    assert.equal(surfaceOf(response), "play");
  });

  it("serves the catalog at the root of the play subdomain", () => {
    const response = proxy(request(PLAY, "/"));
    assert.equal(rewriteTarget(response), "/mysteries");
    assert.equal(surfaceOf(response), "play");
  });

  it("leaves the apex root alone", () => {
    const response = proxy(request(APEX, "/"));
    assert.equal(rewriteTarget(response), null);
  });

  it("sends administration on the play subdomain back to the apex", () => {
    process.env.PUBLIC_SITE_DOMAIN = APEX;
    const response = proxy(request(PLAY, "/admin/shows"));
    assert.equal(redirectTarget(response)?.hostname, APEX);
    assert.equal(redirectTarget(response)?.pathname, "/admin/shows");
  });

  it("sends the troupe portal on the play subdomain back to the apex", () => {
    process.env.PUBLIC_SITE_DOMAIN = APEX;
    const response = proxy(request(PLAY, "/troupe"));
    assert.equal(redirectTarget(response)?.hostname, APEX);
  });

  it("moves catalog paths off the apex once the play domain is configured", () => {
    process.env.PUBLIC_PLAY_DOMAIN = PLAY;
    const response = proxy(request(APEX, "/mysteries/dog-show-debacle"));
    assert.equal(redirectTarget(response)?.hostname, PLAY);
    assert.equal(redirectTarget(response)?.pathname, "/mysteries/dog-show-debacle");
  });

  it("keeps catalog paths on one host while no play domain is configured", () => {
    delete process.env.PUBLIC_PLAY_DOMAIN;
    const response = proxy(request(APEX, "/mysteries"));
    assert.equal(redirectTarget(response), null);
  });
});

describe("coming-soon gate", () => {
  it("holds back the marketing pages when enabled", () => {
    process.env.PUBLIC_COMING_SOON = "true";
    for (const path of ["/", "/about", "/shows", "/shows/whodunnit", "/book"]) {
      const response = proxy(request(APEX, path));
      assert.equal(rewriteTarget(response), "/coming-soon", `expected ${path} to be gated`);
    }
  });

  it("leaves the troupe portal, administration, and sign-in reachable", () => {
    process.env.PUBLIC_COMING_SOON = "true";
    for (const path of ["/troupe", "/troupe/casting", "/admin", "/sign-in"]) {
      const response = proxy(request(APEX, path));
      assert.equal(rewriteTarget(response), null, `expected ${path} to stay reachable`);
    }
  });

  it("does not gate the play subdomain", () => {
    process.env.PUBLIC_COMING_SOON = "true";
    process.env.PUBLIC_PLAY_DOMAIN = PLAY;
    const response = proxy(request(PLAY, "/mysteries"));
    assert.equal(rewriteTarget(response), null);
  });

  it("lets the marketing site through when disabled", () => {
    process.env.PUBLIC_COMING_SOON = "false";
    const response = proxy(request(APEX, "/about"));
    assert.equal(rewriteTarget(response), null);
  });
});
