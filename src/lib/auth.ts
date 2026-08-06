import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const SESSION_COOKIE = "mim_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const CODE_COOLDOWN_SECONDS = 45;
const MAX_CODES_PER_HOUR = 5;

export class LoginCodeRateLimitError extends Error {}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required.");
  return value;
}

/**
 * Set to ".mysteriesinmotion.com" in production so one session covers the
 * marketing site, the troupe portal, and play.mysteriesinmotion.com. Left
 * unset locally, where the cookie is scoped to the current host.
 */
function sessionCookieDomain() {
  return process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Where each audience lands when no specific destination was requested. */
export function defaultLandingPath(role: UserRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "PERFORMER") return "/troupe";
  return "/my-cases";
}

/** Returns the requested path only if it is a safe same-origin destination. */
export function optionalReturnPath(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/my-cases",
) {
  return optionalReturnPath(value) ?? fallback;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashLoginCode(email: string, code: string) {
  return createHmac("sha256", secret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export async function issueLoginCode(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const [latestCode, recentCodeCount] = await Promise.all([
    db.emailLoginCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.emailLoginCode.count({
      where: { email, createdAt: { gte: oneHourAgo } },
    }),
  ]);
  if (
    (latestCode &&
      latestCode.createdAt.getTime() >
        Date.now() - CODE_COOLDOWN_SECONDS * 1_000) ||
    recentCodeCount >= MAX_CODES_PER_HOUR
  ) {
    throw new LoginCodeRateLimitError(
      "Please wait before requesting another sign-in code.",
    );
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);

  await db.$transaction([
    db.emailLoginCode.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    db.emailLoginCode.create({
      data: { email, codeHash: hashLoginCode(email, code), expiresAt },
    }),
  ]);

  return { code, email, expiresAt };
}

export async function verifyLoginCode(
  emailInput: string,
  code: string,
  displayNameInput?: string,
) {
  const email = normalizeEmail(emailInput);
  const displayName =
    displayNameInput
      ?.trim()
      .replace(/\s+/g, " ")
      .slice(0, 100) || null;
  const record = await db.emailLoginCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt <= new Date() || record.attempts >= MAX_CODE_ATTEMPTS) {
    return null;
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashLoginCode(email, code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await db.emailLoginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  return db.$transaction(async (transaction) => {
    const consumed = await transaction.emailLoginCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return null;

    const isAdministrator =
      normalizeEmail(process.env.ADMIN_EMAIL ?? "") === email;

    // An admin-issued invitation grants troupe access on first sign-in. This
    // replaces the shared registration code the Flask application used.
    const invite = isAdministrator
      ? null
      : await transaction.troupeInvite.findFirst({
          where: {
            email,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

    const grantedRole: UserRole | null = isAdministrator
      ? "ADMIN"
      : (invite?.role ?? null);

    const user = await transaction.user.upsert({
      where: { email },
      update: {
        emailVerifiedAt: new Date(),
        ...(displayName ? { displayName } : {}),
        ...(grantedRole ? { role: grantedRole } : {}),
      },
      create: {
        email,
        displayName,
        emailVerifiedAt: new Date(),
        role: grantedRole ?? "CUSTOMER",
      },
    });

    if (invite) {
      await transaction.troupeInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    }

    return user;
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: sessionCookieDomain(),
    expires: expiresAt,
  });
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  await db.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });
  return session.user;
}

export async function requireUser(returnPath = "/my-cases") {
  const user = await currentUser();
  if (!user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(safeReturnPath(returnPath, returnPath))}`,
    );
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect(defaultLandingPath(user.role));
  return user;
}

/**
 * Troupe members and admins share the performer portal; admins keep access so
 * they can see exactly what performers see.
 */
export async function requireTroupe(returnPath = "/troupe") {
  const user = await requireUser(returnPath);
  if (user.role !== "PERFORMER" && user.role !== "ADMIN") {
    redirect(defaultLandingPath(user.role));
  }
  return user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  cookieStore.delete({ name: SESSION_COOKIE, path: "/", domain: sessionCookieDomain() });
}
