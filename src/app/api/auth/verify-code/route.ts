import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSession,
  defaultLandingPath,
  isNewAccount,
  isTroupeEligible,
  safeReturnPath,
  verifyLoginCode,
} from "@/lib/auth";

function audienceOf(value: unknown) {
  return value === "troupe" ? "troupe" : "play";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    email?: unknown;
    code?: unknown;
    next?: unknown;
    audience?: unknown;
  } | null;

  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const audience = audienceOf(body?.audience);

  if (displayName.length > 100) {
    return NextResponse.json({ error: "That name is too long." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  }

  if (audience === "troupe" && !(await isTroupeEligible(email))) {
    return NextResponse.json(
      {
        error:
          "This sign-in is for the cast and staff. Playing a mystery at home? Use the customer sign-in.",
      },
      { status: 403 },
    );
  }

  // Only a brand-new account needs a name, and the check happens before the
  // code is verified so asking for one does not burn the code.
  if (!displayName && (await isNewAccount(email))) {
    return NextResponse.json(
      { error: "Enter your full name to finish setting up your account.", needsName: true },
      { status: 400 },
    );
  }

  const user = await verifyLoginCode(email, code, displayName);
  if (!user) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }

  if (
    audience === "troupe" &&
    user.role !== "PERFORMER" &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.json(
      {
        error:
          "This sign-in is for the cast and staff. Playing a mystery at home? Use the customer sign-in.",
      },
      { status: 403 },
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    next: safeReturnPath(
      typeof body?.next === "string" ? body.next : null,
      defaultLandingPath(user.role, audience),
    ),
  });
  response.cookies.set(SESSION_COOKIE, session.token, session.options);
  return response;
}
