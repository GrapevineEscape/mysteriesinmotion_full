/**
 * Moves the Flask troupe database into the unified schema.
 *
 * Run with --dry-run first. A dry run performs the entire transfer inside a
 * transaction and then rolls it back, so the report describes exactly what the
 * real run would write, including any constraint it would violate, rather than an
 * optimistic guess.
 *
 *   FLASK_DATABASE_URL=... DATABASE_URL=... npm run migrate:flask -- --dry-run
 *
 * Options:
 *   --dry-run              Report only; save nothing.
 *   --scripts=<dir>        Where the Flask script PDFs live.
 *   --show-status=DRAFT    Import shows unpublished (default is PUBLISHED).
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import {
  DryRunComplete,
  readFlask,
  report,
  transfer,
  type Args,
  type Result,
} from "./flask-migration";

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, scriptsDir: null, showStatus: "PUBLISHED" };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--scripts=")) args.scriptsDir = arg.slice("--scripts=".length);
    else if (arg === "--show-status=DRAFT") args.showStatus = "DRAFT";
    else if (arg === "--show-status=PUBLISHED") args.showStatus = "PUBLISHED";
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const sourceUrl = process.env.FLASK_DATABASE_URL;
  if (!sourceUrl) {
    throw new Error("Set FLASK_DATABASE_URL to the Flask Postgres connection string.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL to the unified Postgres database.");
  }

  const scriptsDir =
    args.scriptsDir ?? path.join(process.cwd(), "..", "MIM Website", "app", "static", "MIMscripts");
  let scriptFiles: string[] = [];
  try {
    scriptFiles = (await readdir(scriptsDir)).filter((name) => name.toLowerCase().endsWith(".pdf"));
  } catch {
    console.warn(`Could not read the scripts folder at ${scriptsDir}; scripts will not be matched.`);
  }

  const source = new Client({
    connectionString: sourceUrl,
    // Render terminates TLS with a certificate this client cannot chain to a
    // local root, so verification is relaxed for remote hosts only.
    ssl: /localhost|127\.0\.0\.1/.test(sourceUrl) ? undefined : { rejectUnauthorized: false },
  });
  const db = new PrismaClient();

  try {
    await source.connect();
    const data = await readFlask(source);

    let result: Result;
    try {
      result = await db.$transaction(
        async (tx) => {
          const outcome = await transfer(tx, data, args, scriptFiles);
          if (args.dryRun) throw new DryRunComplete(outcome);
          return outcome;
        },
        { timeout: 10 * 60_000, maxWait: 60_000 },
      );
    } catch (error) {
      if (!(error instanceof DryRunComplete)) throw error;
      result = error.result;
    }

    report(data, result, args);
    console.log(
      args.dryRun
        ? `\nDry run only — nothing was saved. Re-run without --dry-run to apply.`
        : `\nMigration applied.`,
    );
  } finally {
    await source.end().catch(() => {});
    await db.$disconnect();
  }
}

await main();
