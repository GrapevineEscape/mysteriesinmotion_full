/**
 * Starts a throwaway Postgres for integration checks: PGlite behind the real
 * wire protocol, migrated to the current schema, gone when the check finishes.
 * No Docker and no shared database, so a run can never disturb development
 * data or collide with another run.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const run = promisify(execFile);

/**
 * PGlite serves one connection at a time, which is why the pool is capped and
 * prepared statements are disabled.
 */
function urlFor(port) {
  return `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&pgbouncer=true`;
}

export async function startEphemeralPostgres({ migrate = true } = {}) {
  // A random high port keeps concurrent runs, and a developer's own database,
  // out of each other's way.
  const port = 5500 + Math.floor(Math.random() * 400);
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
  await server.start();

  const url = urlFor(port);

  async function stop() {
    await server.stop();
    await db.close();
  }

  if (migrate) {
    try {
      await run("npx", ["prisma", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: url },
        shell: process.platform === "win32",
      });
    } catch (error) {
      await stop();
      throw error;
    }
  }

  return { url, stop };
}
