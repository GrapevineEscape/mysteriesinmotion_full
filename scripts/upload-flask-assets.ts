/**
 * Moves the files the Flask application kept on disk into R2 and points the
 * migrated records at them.
 *
 * Flask served scripts from static/MIMscripts and uploads from static/uploads.
 * Render's filesystem does not survive a deploy, so those folders in the working
 * copy are the only reliable source; nothing here reads the live server.
 *
 *   R2_ASSET_BUCKET=... npm run migrate:assets -- --dry-run
 *
 * Scripts and cover images are matched to shows by title. Headshots were named
 * after the Flask user id, which the unified schema no longer has, so matching
 * them needs FLASK_DATABASE_URL to translate that id into an email address.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { matchScript } from "./flask-script-match";

type Args = { dryRun: boolean; staticDir: string | null };

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, staticDir: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--static=")) args.staticDir = arg.slice("--static=".length);
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  return args;
}

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function contentType(filename: string) {
  return CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

async function listFiles(dir: string) {
  try {
    return await readdir(dir);
  } catch {
    console.warn(`Could not read ${dir}; nothing from it will be uploaded.`);
    return [];
  }
}

type Planned = {
  what: string;
  record: string;
  file: string;
  key: string;
  matchedBy: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL to the unified Postgres database.");
  }

  const staticDir =
    args.staticDir ?? path.join(process.cwd(), "..", "MIM Website", "app", "static");
  const scriptsDir = path.join(staticDir, "MIMscripts");
  const uploadsDir = path.join(staticDir, "uploads");

  const scriptFiles = (await listFiles(scriptsDir)).filter((name) =>
    name.toLowerCase().endsWith(".pdf"),
  );
  const uploadFiles = await listFiles(uploadsDir);

  const db = new PrismaClient();
  const planned: Planned[] = [];
  const notes: string[] = [];

  try {
    // Scripts, matched to shows by title -------------------------------------
    // Every type is considered, not just live ones: the three titles the troupe
    // performs and also sells as recordings live on ONLINE records, yet their
    // scripts and cover art still belong to the performers.
    const shows = await db.show.findMany({
      select: { id: true, title: true, slug: true, scriptUrl: true, coverImageUrl: true },
      orderBy: { displayOrder: "asc" },
    });

    const claimed = new Set<string>();
    for (const show of shows) {
      if (show.scriptUrl) {
        notes.push(`"${show.title}" already has a script reference; left alone.`);
        continue;
      }
      const match = matchScript({ title: show.title }, scriptFiles);
      if (!match) {
        notes.push(`No script on disk resembles "${show.title}".`);
        continue;
      }
      if (claimed.has(match.filename)) {
        notes.push(
          `${match.filename} matches more than one show; "${show.title}" was left without a script to avoid guessing.`,
        );
        continue;
      }
      claimed.add(match.filename);
      planned.push({
        what: "script",
        record: show.title,
        file: path.join(scriptsDir, match.filename),
        key: `scripts/${show.slug}${path.extname(match.filename).toLowerCase()}`,
        matchedBy: match.how,
      });
    }

    // Cover images, matched by the name Flask saved them under ---------------
    for (const show of shows) {
      if (show.coverImageUrl) continue;
      const expected = uploadFiles.find(
        (name) => name.toLowerCase() === `${show.title.toLowerCase()}_image.png`,
      );
      if (!expected) continue;
      planned.push({
        what: "cover image",
        record: show.title,
        file: path.join(uploadsDir, expected),
        key: `shows/${show.slug}/cover.png`,
        matchedBy: "title-convention",
      });
    }

    // Headshots, which need the Flask ids to identify a person ---------------
    const headshots = uploadFiles.filter((name) => /_headshot\.[a-z]+$/i.test(name));
    if (headshots.length && !process.env.FLASK_DATABASE_URL) {
      notes.push(
        `${headshots.length} headshot file(s) found, but headshots are named after Flask user ids. Set FLASK_DATABASE_URL so they can be matched to people.`,
      );
    } else if (headshots.length) {
      const source = new Client({
        connectionString: process.env.FLASK_DATABASE_URL,
        ssl: /localhost|127\.0\.0\.1/.test(process.env.FLASK_DATABASE_URL!)
          ? undefined
          : { rejectUnauthorized: false },
      });
      await source.connect();
      try {
        const { rows } = await source.query<{ id: number; email: string }>(
          `SELECT id, email FROM "user"`,
        );
        const emailById = new Map(rows.map((row) => [String(row.id), row.email.toLowerCase()]));
        for (const filename of headshots) {
          const flaskId = filename.split("_")[0];
          const email = emailById.get(flaskId);
          if (!email) {
            notes.push(`${filename} does not correspond to any Flask user; skipped.`);
            continue;
          }
          const user = await db.user.findUnique({
            where: { email },
            select: { id: true, headshotUrl: true },
          });
          if (!user) {
            notes.push(`${filename} belongs to ${email}, who is not in the database; skipped.`);
            continue;
          }
          if (user.headshotUrl) {
            notes.push(`${email} already has a headshot; left alone.`);
            continue;
          }
          planned.push({
            what: "headshot",
            record: email,
            file: path.join(uploadsDir, filename),
            key: `headshots/${user.id}${path.extname(filename).toLowerCase()}`,
            matchedBy: "flask-user-id",
          });
        }
      } finally {
        await source.end().catch(() => {});
      }
    }

    console.log(`\n=== ${args.dryRun ? "Would upload" : "Uploading"} ${planned.length} file(s) ===`);
    console.table(
      planned.map((item) => ({
        what: item.what,
        record: item.record,
        file: path.basename(item.file),
        key: item.key,
        matchedBy: item.matchedBy,
      })),
    );

    if (!args.dryRun) {
      const { putR2Object } = await import("@/lib/cloudflare-r2");
      for (const item of planned) {
        const body = await readFile(item.file);
        const reference = await putR2Object(item.key, body, contentType(item.file));

        if (item.what === "script") {
          await db.show.updateMany({
            where: { title: item.record, type: { not: "ONLINE" } },
            data: { scriptUrl: reference },
          });
        } else if (item.what === "cover image") {
          await db.show.updateMany({
            where: { title: item.record, type: { not: "ONLINE" } },
            data: { coverImageUrl: reference },
          });
        } else {
          await db.user.update({
            where: { email: item.record },
            data: { headshotUrl: reference },
          });
        }
        console.log(`  uploaded ${item.key}`);
      }
    }

    if (notes.length) {
      console.log(`\n=== Things worth your attention (${notes.length}) ===`);
      for (const note of notes) console.log(`  - ${note}`);
    }
    console.log(
      args.dryRun
        ? `\nDry run only — nothing was uploaded or saved.`
        : `\nDone. ${planned.length} file(s) uploaded.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
