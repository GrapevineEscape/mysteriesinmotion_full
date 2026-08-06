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

/**
 * The socket server accepts a single connection unless told otherwise, and
 * refuses the rest. That is too few: `next dev` serves route handlers from a
 * different worker than pages, and a seed or migration run alongside the dev
 * server needs its own. Queries are queued inside the server, so raising this
 * costs nothing but lets every client connect.
 */
const MAX_CONNECTIONS = Number(process.env.LOCAL_DB_MAX_CONNECTIONS ?? 20);

const dataDir = process.env.LOCAL_DB_MEMORY === "true" ? undefined : DATA_DIR;
if (dataDir) await mkdir(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: "127.0.0.1",
  maxConnections: MAX_CONNECTIONS,
});
await server.start();

console.log(`Postgres (PGlite) listening on 127.0.0.1:${PORT}`);
console.log(`  storage: ${dataDir ?? "in memory"}`);
console.log(`  max connections: ${MAX_CONNECTIONS}`);
// Prepared statements stay off: PGlite is one Postgres backend behind every
// connection, so two clients both naming a statement "s0" would collide.
console.log(
  `  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?pgbouncer=true"`,
);
console.log("Press Ctrl+C to stop.");

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
