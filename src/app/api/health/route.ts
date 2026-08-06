import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const [databaseResult, showCount] = await Promise.all([
      db.$queryRaw`SELECT 1`,
      db.show.count(),
    ]);
    void databaseResult;
    return NextResponse.json({
      status: "ok",
      service: "online-mystery",
      database: "connected",
      seededShows: showCount,
      timestamp,
    });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      { status: "degraded", service: "online-mystery", database: "disconnected", timestamp },
      { status: 503 },
    );
  }
}
