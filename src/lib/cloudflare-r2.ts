import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function parseR2Reference(reference: string) {
  if (!reference.startsWith("r2://")) return null;
  const withoutScheme = reference.slice("r2://".length);
  const slash = withoutScheme.indexOf("/");
  if (slash <= 0 || slash === withoutScheme.length - 1) return null;
  return {
    bucket: withoutScheme.slice(0, slash),
    key: decodeURIComponent(withoutScheme.slice(slash + 1)),
  };
}

/**
 * Converts an r2://bucket/object-key reference into a short-lived GET URL.
 * Existing HTTPS references remain untouched for backward compatibility.
 */
export async function secureR2Reference(reference: string | null) {
  if (!reference) return null;
  const object = parseR2Reference(reference);
  if (!object) return reference;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      "An R2 clue reference was configured, but private R2 credentials are missing.",
    );
    return null;
  }

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: object.bucket,
        Key: object.key,
      }),
      { expiresIn: 6 * 60 * 60 },
    );
  } catch (error) {
    console.error("Unable to sign the private R2 clue reference.", error);
    return null;
  }
}
