/**
 * The address the visitor actually used. Behind Render, request.url is the
 * internal listener (localhost:10000), so redirects must follow the forwarded
 * host instead.
 */
export function publicOrigin(request: Request) {
  const forwarded =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = forwarded?.split(",")[0]?.trim();
  if (!host) return new URL(request.url).origin;

  const forwardedProto = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}
