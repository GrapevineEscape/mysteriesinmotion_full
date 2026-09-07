import { NextResponse } from "next/server";
import {
  issueLoginCode,
  isTroupeEligible,
  LoginCodeRateLimitError,
  normalizeEmail,
} from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function audienceOf(value: unknown) {
  return value === "troupe" ? "troupe" : "play";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    audience?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const audience = audienceOf(body?.audience);

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    if (audience === "troupe" && !(await isTroupeEligible(email))) {
      // Same success response so this door does not reveal who is on the cast.
      return NextResponse.json({ ok: true });
    }
    const login = await issueLoginCode(email);
    await sendLoginCode(login);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LoginCodeRateLimitError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 },
      );
    }
    console.error("Login-code request failed", error);
    return NextResponse.json(
      { error: "Email sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
