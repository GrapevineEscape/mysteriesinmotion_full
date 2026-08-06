/**
 * Which chrome a request should be rendered inside. Resolved by the proxy and
 * passed to the app as a request header so server components can render the
 * right navigation without duplicating layouts per route group.
 *
 * "play" and "site" are the two public hostnames. "portal" covers the signed-in
 * troupe area, which brings its own sidebar and suppresses the marketing
 * header and footer.
 */
export type Surface = "play" | "site" | "portal";

/** The two surfaces that render public marketing chrome. */
export type PublicSurface = Exclude<Surface, "portal">;

export const SURFACE_HEADER = "x-mim-surface";

export function surfaceFromHeader(value: string | null | undefined): Surface {
  if (value === "play") return "play";
  if (value === "portal") return "portal";
  return "site";
}
