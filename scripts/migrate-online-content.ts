/**
 * Exports Case Room content from the Online Mystery Postgres and/or imports it
 * into DATABASE_URL. Media stays in Cloudflare; only DB references move.
 *
 *   npm run migrate:online -- --export
 *   npm run migrate:online -- --import
 *   npm run migrate:online -- --export --import
 *   npm run migrate:online -- --inventory
 */
import {
  defaultPackPath,
  exportOnlineContent,
  importOnlineContent,
  inventoryOnlineContent,
  onlineClient,
  readOnlineContentPack,
  reportInventory,
  writeOnlineContentPack,
} from "./online-content";
import { PrismaClient } from "@prisma/client";

type Args = {
  export: boolean;
  import: boolean;
  inventory: boolean;
  packPath: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    export: false,
    import: false,
    inventory: false,
    packPath: defaultPackPath(),
  };
  for (const arg of argv) {
    if (arg === "--export") args.export = true;
    else if (arg === "--import") args.import = true;
    else if (arg === "--inventory") args.inventory = true;
    else if (arg.startsWith("--pack=")) args.packPath = arg.slice("--pack=".length);
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  if (!args.export && !args.import && !args.inventory) {
    args.export = true;
    args.import = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.inventory || args.export) {
    const sourceUrl = process.env.ONLINE_DATABASE_URL;
    if (!sourceUrl) {
      throw new Error("Set ONLINE_DATABASE_URL to the Online Mystery Postgres connection string.");
    }
    const source = onlineClient(sourceUrl);
    try {
      await source.connect();
      if (args.inventory || args.export) {
        const rows = await inventoryOnlineContent(source);
        reportInventory(rows);
      }
      if (args.export) {
        const pack = await exportOnlineContent(source);
        await writeOnlineContentPack(pack, args.packPath);
        console.log(`\nWrote content pack to ${args.packPath}`);
        console.log(
          `Shows: ${pack.shows.length}; questions: ${pack.shows.reduce((n, s) => n + s.questions.length, 0)}; clues: ${pack.shows.reduce((n, s) => n + s.evidenceItems.length, 0)}`,
        );
      }
    } finally {
      await source.end().catch(() => {});
    }
  }

  if (args.import) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Set DATABASE_URL to the unified Postgres database.");
    }
    const pack = await readOnlineContentPack(args.packPath);
    const db = new PrismaClient();
    try {
      const result = await importOnlineContent(db, pack);
      console.log("\n=== Imported online content ===");
      console.table([
        { table: "shows", rows: result.showsUpserted },
        { table: "onlineDetails", rows: result.onlineUpserted },
        { table: "suspects", rows: result.suspects },
        { table: "questions", rows: result.questions },
        { table: "answerChoices", rows: result.answerChoices },
        { table: "evidenceItems", rows: result.evidenceItems },
        { table: "resultTiers", rows: result.resultTiers },
      ]);
    } finally {
      await db.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
