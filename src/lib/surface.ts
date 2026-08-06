/**
 * Which of the two hostnames served a request. Resolved by the proxy and
 * passed to the app as a request header so server components can render the
 * right navigation without duplicating layouts per route group.
 */
export type Surface = "play" | "site";

export const SURFACE_HEADER = "x-mim-surface";

export function surfaceFromHeader(value: string | null | undefined): Surface {
  return value === "play" ? "play" : "site";
}
