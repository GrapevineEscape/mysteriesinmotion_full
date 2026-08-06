/**
 * Checks that the R2 configuration can actually store and retrieve a file.
 *
 * Cloudflare answers a great many different mistakes with the same opaque 403,
 * so each capability is probed separately: whether the keys are recognised at
 * all, whether the bucket is reachable, and whether the token may write. The
 * failure that matters is reported in terms of what to change.
 *
 *   npm run verify:r2
 *
 * No secret is printed. The access key id is shown only as a short prefix, which
 * is enough to tell two tokens apart without disclosing either.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

class Unusable extends Error {}

function code(error: unknown) {
  const named = error as {
    name?: string;
    Code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  // HEAD requests carry no response body, so Cloudflare's reason arrives only as
  // a status code and the SDK has nothing to name the error after.
  const status = named.$metadata?.httpStatusCode;
  const label = named.Code ?? named.name ?? named.message ?? "unknown";
  return status ? `${label}, HTTP ${status}` : label;
}

const PROBE_KEY = "_diagnostics/write-probe.txt";

async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_ASSET_BUCKET?.trim().replace(/^\/+|\/+$/g, "");
  const endpoint =
    process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;

  const missing = [
    ["CLOUDFLARE_ACCOUNT_ID", accountId],
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_ASSET_BUCKET", bucket],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Unusable(`Not configured. Missing: ${missing.map(([name]) => name).join(", ")}`);
  }

  console.log("Configuration");
  console.table([
    { setting: "endpoint", value: endpoint },
    { setting: "bucket", value: bucket },
    {
      setting: "access key id",
      value: `${accessKeyId!.slice(0, 6)}… (${accessKeyId!.length} chars)`,
    },
    { setting: "secret length", value: `${secretAccessKey!.length} chars` },
  ]);

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  });

  console.log("\nChecks");

  // Are the keys recognised at all? A bucket-scoped token is forbidden from
  // listing buckets, so a refusal here is expected and harmless. What this
  // separates out is a mistyped key or a mismatched account id.
  try {
    const { Buckets } = await client.send(new ListBucketsCommand({}));
    const names = (Buckets ?? []).map((entry) => entry.Name);
    console.log(`  keys accepted, and this token can see: ${names.join(", ") || "no buckets"}`);
    if (names.length && !names.includes(bucket!)) {
      console.log(`  note: R2_ASSET_BUCKET is "${bucket}", which is not in that list`);
    }
  } catch (error) {
    const reason = code(error);
    if (reason === "InvalidAccessKeyId" || reason === "SignatureDoesNotMatch") {
      console.log(`  keys REJECTED (${reason})`);
      throw new Unusable(
        [
          "The access key or secret is wrong, or the account id belongs to a different account.",
          "",
          "Create a fresh token under R2 → API → Create Account API token and copy the",
          "Access Key ID and Secret Access Key exactly as shown.",
        ].join("\n"),
      );
    }
    console.log(`  cannot list buckets (${reason}) — normal for a bucket-scoped token`);
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`  bucket "${bucket}" is reachable`);
  } catch (error) {
    const reason = code(error);
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    console.log(`  bucket "${bucket}" NOT reachable (${reason})`);
    if (status === 404 || reason.startsWith("NoSuchBucket") || reason.startsWith("NotFound")) {
      throw new Unusable(
        [
          `Nothing named "${bucket}" is visible at ${endpoint}.`,
          "",
          "Either the bucket does not exist, or the token is scoped to other buckets and so",
          "cannot see it. Check R2 → Overview for the exact bucket name, then make sure",
          "R2_ASSET_BUCKET matches it and the token is scoped to include it.",
        ].join("\n"),
      );
    }
    throw new Unusable(
      [
        `The bucket "${bucket}" exists, but this token may not touch it.`,
        "",
        "The token was most likely scoped to a different bucket. Edit it under R2 → API",
        "and scope it to this bucket, or allow all buckets.",
      ].join("\n"),
    );
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: PROBE_KEY,
        Body: Buffer.from("Written by npm run verify:r2. Safe to delete.\n"),
        ContentType: "text/plain",
      }),
    );
    console.log("  writing is permitted");
  } catch (error) {
    console.log(`  writing REFUSED (${code(error)})`);
    throw new Unusable(
      [
        "The token can reach the bucket but not write to it.",
        "",
        'It was almost certainly created with "Object Read only". Edit it under R2 → API',
        'and change the permission to "Object Read & Write". Nothing else needs to change.',
      ].join("\n"),
    );
  }

  try {
    await client.send(new GetObjectCommand({ Bucket: bucket, Key: PROBE_KEY }));
    console.log("  reading back is permitted");
  } catch (error) {
    throw new Unusable(
      `The file was written but could not be read back (${code(error)}), ` +
        "so signed URLs for scripts and headshots would fail.",
    );
  }

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: PROBE_KEY }));
    console.log("  probe file cleaned up");
  } catch (error) {
    console.log(`  could not delete the probe file (${code(error)}); remove ${PROBE_KEY} by hand`);
  }

  console.log("\nR2 is configured correctly. npm run migrate:assets will work.\n");
}

main().catch((error) => {
  if (error instanceof Unusable) console.error(`\n${error.message}\n`);
  else console.error(error);
  process.exitCode = 1;
});
