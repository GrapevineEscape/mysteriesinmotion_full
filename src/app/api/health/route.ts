import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Render restarts the service when this path takes longer than five seconds
 * or returns an error. A database blip must not do that: the process is still
 * alive, and restarting it does not bring the database back.
 */
async function databaseStatus() {
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("database health check timed out")), 2000);
      }),
    ]);
    return "connected" as const;
  } catch (error) {
    console.error("Database health check failed", error);
    return "disconnected" as const;
  }
}

export async function GET() {
  const database = await databaseStatus();
  return NextResponse.json({
    status: "ok",
    service: "online-mystery",
    database,
    timestamp: new Date().toISOString(),
  });
}
