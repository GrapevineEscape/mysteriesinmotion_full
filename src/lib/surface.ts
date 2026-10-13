/**
 * Which chrome a request should be rendered inside. Resolved by the proxy and
 * passed to the app as a request header so server components can render the
 * right navigation without duplicating layouts per route group.
 *
 * "play" and "site" are the two public doors (hire vs play-at-home). They map
 * to separate hostnames once DNS is attached; until then, play-only paths on
 * the Render URL still resolve to "play" so the chrome can differ. "portal"
 * covers the signed-in troupe area, which brings its own sidebar and
 * suppresses the marketing header and footer.
 */
export type Surface = "play" | "site" | "portal";

/** The two surfaces that render public marketing chrome. */
export type PublicSurface = Exclude<Surface, "portal">;

export const SURFACE_HEADER = "x-mim-surface";

/** Set by the proxy when a marketing page is being shown as the holding page. */
export const HOLDING_HEADER = "x-mim-holding";

export function surfaceFromHeader(value: string | null | undefined): Surface {
  if (value === "play") return "play";
  if (value === "portal") return "portal";
  return "site";
}
