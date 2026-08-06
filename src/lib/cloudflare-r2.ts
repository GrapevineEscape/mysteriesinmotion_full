import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class R2ConfigurationError extends Error {}

function r2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

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

  const client = r2Client();
  if (!client) {
    console.error(
      "An R2 reference was configured, but private R2 credentials are missing.",
    );
    return null;
  }

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: object.bucket,
        Key: object.key,
      }),
      { expiresIn: 6 * 60 * 60 },
    );
  } catch (error) {
    console.error("Unable to sign the private R2 reference.", error);
    return null;
  }
}

/**
 * Signs a reference for inline viewing rather than download, so a script PDF
 * opens in the browser's viewer the way the Flask portal served it.
 */
export async function secureR2Download(
  reference: string | null,
  filename: string,
) {
  if (!reference) return null;
  const object = parseR2Reference(reference);
  if (!object) return reference;

  const client = r2Client();
  if (!client) {
    console.error(
      "An R2 reference was configured, but private R2 credentials are missing.",
    );
    return null;
  }

  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: object.bucket,
        Key: object.key,
        ResponseContentDisposition: `inline; filename="${filename.replace(/"/g, "")}"`,
      }),
      { expiresIn: 60 * 60 },
    );
  } catch (error) {
    console.error("Unable to sign the private R2 reference.", error);
    return null;
  }
}

/**
 * Stores an object and returns the r2:// reference to save against a record.
 * Uploads go to a private bucket; nothing here is publicly addressable.
 */
export async function putR2Object(
  key: string,
  body: Buffer,
  contentType: string,
) {
  // A bucket name, not a path. Tolerate a trailing slash rather than passing it
  // through and getting back an opaque complaint about an invalid bucket.
  const bucket = process.env.R2_ASSET_BUCKET?.trim().replace(/^\/+|\/+$/g, "");
  const client = r2Client();
  if (!bucket || !client) {
    throw new R2ConfigurationError(
      "File storage is not configured. Set R2_ASSET_BUCKET and the R2 credentials.",
    );
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `r2://${bucket}/${key}`;
}
