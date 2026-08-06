import { NextResponse, type NextRequest } from "next/server";
import { SURFACE_HEADER, type Surface } from "@/lib/surface";

/**
 * One deployment serves two hostnames. The apex carries the marketing site,
 * the troupe portal, and administration; the play subdomain carries the online
 * mystery catalog and Case Room.
 *
 * Rather than duplicate layouts per route group, the surface is resolved here
 * and passed to the app as a request header so the shared layout can render the
 * right navigation. Only the site root differs between the two hosts, so it is
 * the only path that needs rewriting.
 */

const PLAY_LANDING = "/mysteries";

/** Paths that belong exclusively to the play subdomain. */
const PLAY_ONLY = [/^\/mysteries(\/|$)/, /^\/play(\/|$)/, /^\/my-cases$/, /^\/how-it-works$/];

/** Paths the coming-soon gate holds back. Everything else stays reachable. */
const GATED_MARKETING = [/^\/$/, /^\/about$/, /^\/shows(\/|$)/, /^\/book$/];

/** Paths that only make sense on the apex. */
const APEX_ONLY = [/^\/admin(\/|$)/, /^\/troupe(\/|$)/];

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
  const surface: Surface = isPlayHost(hostname) ? "play" : "site";
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
  const playDomain = process.env.PUBLIC_PLAY_DOMAIN?.trim();
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
