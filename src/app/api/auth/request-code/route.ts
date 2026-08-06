import { NextResponse } from "next/server";
import {
  issueLoginCode,
  LoginCodeRateLimitError,
  normalizeEmail,
} from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
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
