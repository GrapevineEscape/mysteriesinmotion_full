type CloudflareTokenResponse = {
  errors?: Array<{ message?: string }>;
  result?: { token?: string };
  success?: boolean;
};

function videoUid(videoReference: string) {
  const trimmedReference = videoReference.trim();
  const embeddedSource =
    trimmedReference.match(/src=["']([^"']+)["']/i)?.[1] ?? trimmedReference;
  if (!/^https?:\/\//i.test(embeddedSource)) return embeddedSource;

  const segments = new URL(embeddedSource).pathname.split("/").filter(Boolean);
  const playerSuffix = segments.findIndex((segment) =>
    ["iframe", "watch", "manifest"].includes(segment),
  );
  return (
    segments[
      Math.max(0, playerSuffix === -1 ? segments.length - 1 : playerSuffix - 1)
    ] ?? ""
  );
}

/**
 * Returns a short-lived Stream token when private playback is enabled.
 * Public video references remain unchanged so existing shows keep working
 * until their Cloudflare "Require signed URLs" setting is enabled.
 */
export async function secureStreamReference(
  videoReference: string | null,
): Promise<string | null> {
  if (!videoReference) return null;
  if (process.env.CLOUDFLARE_STREAM_SIGNED_URLS !== "true") {
    return videoReference;
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const uid = videoUid(videoReference);
  if (!accountId || !apiToken || !uid) {
    console.error(
      "Private Stream playback is enabled, but Cloudflare credentials or the video UID are missing.",
    );
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/stream/${encodeURIComponent(uid)}/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // A six-hour token covers long games and paused investigations.
          exp: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    const payload = (await response.json()) as CloudflareTokenResponse;
    if (!response.ok || !payload.success || !payload.result?.token) {
      console.error(
        "Cloudflare Stream token generation failed.",
        payload.errors?.map((error) => error.message).filter(Boolean),
      );
      return null;
    }
    return payload.result.token;
  } catch (error) {
    console.error("Cloudflare Stream token generation failed.", error);
    return null;
  }
}
