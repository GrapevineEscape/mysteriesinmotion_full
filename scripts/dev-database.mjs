/**
 * A local Postgres for development, with no Docker required.
 *
 * PGlite is Postgres compiled to WebAssembly; the socket server puts it behind
 * the real wire protocol so Prisma, psql, and the app connect to it exactly as
 * they would to a hosted database. Data persists in .pglite/ between runs.
 *
 * Run with: npm run db:local
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5432);
const DATA_DIR = path.join(process.cwd(), ".pglite");

const dataDir = process.env.LOCAL_DB_MEMORY === "true" ? undefined : DATA_DIR;
if (dataDir) await mkdir(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
await server.start();

console.log(`Postgres (PGlite) listening on 127.0.0.1:${PORT}`);
console.log(`  storage: ${dataDir ?? "in memory"}`);
// PGlite serves one connection at a time, so a pooled client has to be capped
// or its second connection is refused mid-run. Prepared statements are
// disabled for the same reason: names outlive a reconnect and collide.
console.log(
  `  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?connection_limit=1&pgbouncer=true"`,
);
console.log("Press Ctrl+C to stop.");

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
