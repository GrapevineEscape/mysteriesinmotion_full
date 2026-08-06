import { NextResponse } from "next/server";
import {
  createSession,
  defaultLandingPath,
  safeReturnPath,
  verifyLoginCode,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    email?: unknown;
    code?: unknown;
    next?: unknown;
  } | null;

  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!displayName || displayName.length > 100) {
    return NextResponse.json(
      { error: "Enter your full name." },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  }

  const user = await verifyLoginCode(email, code, displayName);
  if (!user) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    next: safeReturnPath(
      typeof body?.next === "string" ? body.next : null,
      defaultLandingPath(user.role),
    ),
  });
}
