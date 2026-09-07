import { NextResponse, type NextRequest } from "next/server";
import { SURFACE_HEADER, type Surface } from "@/lib/surface";

/**
 * One deployment serves two customer doors. The hire site is the company
 * people book; the play catalog is mysteries they start at home. Those doors
 * become separate hostnames once DNS is attached. Until PUBLIC_PLAY_DOMAIN is
 * set, both live on the same Render URL and play-only paths still get play
 * chrome so the navigation does not treat them as equal siblings.
 *
 * Rather than duplicate layouts per route group, the surface is resolved here
 * and passed to the app as a request header so the shared layout can render the
 * right navigation. Only the site root differs between the two hosts, so it is
 * the only path that needs rewriting.
 */

const PLAY_LANDING = "/mysteries";

/** Paths that belong exclusively to the play door. */
const PLAY_ONLY = [
  /^\/mysteries(\/|$)/,
  /^\/play(\/|$)/,
  /^\/my-cases$/,
  /^\/how-it-works$/,
  /^\/sign-in$/,
];

/** Paths the coming-soon gate holds back. Everything else stays reachable. */
const GATED_MARKETING = [
  /^\/$/,
  /^\/about$/,
  /^\/shows(\/|$)/,
  /^\/book$/,
  /^\/broadcast$/,
];

/** Paths that only make sense on the apex. */
const APEX_ONLY = [/^\/admin(\/|$)/, /^\/troupe(\/|$)/];

/** Signed-in areas that supply their own chrome. */
const PORTAL = [/^\/troupe(\/|$)/, /^\/admin(\/|$)/];

function hostnameOf(request: NextRequest) {
  const header = request.headers.get("host") ?? "";
  return header.split(":")[0]!.toLowerCase();
}

function isPlayHost(hostname: string) {
  const configured = process.env.PUBLIC_PLAY_DOMAIN?.trim().toLowerCase();
  if (configured && hostname === configured) return true;
  // Covers play.mysteriesinmotion.com and play.localhost during development.
  return hostname.startsWith("play.");
}

function matches(patterns: RegExp[], pathname: string) {
  return patterns.some((pattern) => pattern.test(pathname));
}

function withSurface(request: NextRequest, surface: Surface) {
  const headers = new Headers(request.headers);
  headers.set(SURFACE_HEADER, surface);
  return headers;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = hostnameOf(request);
  const playDomain = process.env.PUBLIC_PLAY_DOMAIN?.trim();
  const surface: Surface = isPlayHost(hostname)
    ? "play"
    : matches(PORTAL, pathname)
      ? "portal"
      : !playDomain && matches(PLAY_ONLY, pathname)
        ? "play"
        : "site";
  const headers = withSurface(request, surface);

  if (surface === "play") {
    // Administration and the troupe portal live on the apex only.
    if (matches(APEX_ONLY, pathname)) {
      const apex = process.env.PUBLIC_SITE_DOMAIN?.trim();
      if (apex) {
        const target = new URL(request.nextUrl);
        target.hostname = apex;
        target.port = "";
        return NextResponse.redirect(target);
      }
      return new NextResponse("Not found", { status: 404 });
    }

    // The catalog is the front door of the play subdomain.
    if (pathname === "/") {
      const target = request.nextUrl.clone();
      target.pathname = PLAY_LANDING;
      return NextResponse.rewrite(target, { request: { headers } });
    }

    return NextResponse.next({ request: { headers } });
  }

  // Keep the online catalog on its own hostname once that domain is live, so
  // the two surfaces do not serve duplicate content.
  if (playDomain && matches(PLAY_ONLY, pathname)) {
    const target = new URL(request.nextUrl);
    target.hostname = playDomain;
    target.port = "";
    return NextResponse.redirect(target);
  }

  // The marketing site stays behind a gate until it is ready to launch. The
  // troupe portal, administration, and sign-in remain reachable throughout.
  if (
    process.env.PUBLIC_COMING_SOON === "true" &&
    matches(GATED_MARKETING, pathname)
  ) {
    const target = request.nextUrl.clone();
    target.pathname = "/coming-soon";
    return NextResponse.rewrite(target, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Everything except Next.js internals, the API, and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
