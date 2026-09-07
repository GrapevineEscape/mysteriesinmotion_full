import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { AuthAudience } from "@/lib/auth-audience";

export type { AuthAudience } from "@/lib/auth-audience";

export const SESSION_COOKIE = "mim_session";
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
 * Set SESSION_COOKIE_DOMAIN to ".mysteriesinmotion.com" only after the custom
 * domain is live. Until then leave it empty — a Domain attribute for
 * mysteriesinmotion.com is rejected by the browser on *.onrender.com, which
 * looks like "sign-in succeeded then dumped me back on the sign-in page".
 */
function sessionCookieDomain(hostname: string | null) {
  const configured = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (!configured) return undefined;

  const bare = configured.replace(/^\./, "").toLowerCase();
  const host = (hostname ?? "").toLowerCase();
  if (host && (host === bare || host.endsWith(`.${bare}`))) {
    return configured.startsWith(".") ? configured : `.${bare}`;
  }
  return undefined;
}

async function requestHostname() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  return host?.split(":")[0] ?? null;
}

export function sessionCookieOptions(expiresAt: Date, hostname: string | null) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: sessionCookieDomain(hostname),
    expires: expiresAt,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Whether signing in with this address would create a new account. */
export async function isNewAccount(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !existing;
}

const TROUPE_PATH = /^\/(troupe|admin)(\/|$)/;

export function isTroupeReturnPath(value: string | null | undefined) {
  return Boolean(optionalReturnPath(value) && TROUPE_PATH.test(value!));
}

export function signInHref(
  audience: AuthAudience,
  returnPath?: string | null,
) {
  const path = audience === "troupe" ? "/troupe/sign-in" : "/sign-in";
  const next = optionalReturnPath(returnPath);
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

/**
 * Play sign-in always returns to the case files. Troupe sign-in returns staff
 * to the portal. A performer who signs in on the play door is playing, not
 * reporting for work.
 */
export function defaultLandingPath(
  role: UserRole,
  audience: AuthAudience = "play",
) {
  if (audience === "play") return "/my-cases";
  if (role === "ADMIN") return "/admin";
  if (role === "PERFORMER") return "/troupe";
  return "/my-cases";
}

/**
 * Cast and staff only. A family playing a case is not admitted through this
 * door, even if they already have a customer account.
 */
export async function isTroupeEligible(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email) return false;
  if (email === normalizeEmail(process.env.ADMIN_EMAIL ?? "")) return true;

  const [user, invite] = await Promise.all([
    db.user.findUnique({
      where: { email },
      select: { role: true },
    }),
    db.troupeInvite.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);

  return user?.role === "PERFORMER" || user?.role === "ADMIN" || Boolean(invite);
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

    // A name supplied at sign-in only fills a gap. Returning members keep the
    // name they set on their profile, so a typo here cannot overwrite it.
    const existing = await transaction.user.findUnique({
      where: { email },
      select: { displayName: true },
    });

    const user = await transaction.user.upsert({
      where: { email },
      update: {
        emailVerifiedAt: new Date(),
        ...(displayName && !existing?.displayName ? { displayName } : {}),
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

  const hostname = await requestHostname();
  const options = sessionCookieOptions(expiresAt, hostname);

  // Also set via next/headers for Server Actions; Route Handlers should copy
  // these onto the NextResponse they return so Set-Cookie is guaranteed.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, options);

  return { token, options };
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

export async function requireUser(
  returnPath = "/my-cases",
  audience: AuthAudience = "play",
) {
  const user = await currentUser();
  if (!user) {
    redirect(signInHref(audience, safeReturnPath(returnPath, returnPath)));
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin", "troupe");
  if (user.role !== "ADMIN") redirect(defaultLandingPath(user.role, "troupe"));
  return user;
}

/**
 * Troupe members and admins share the performer portal; admins keep access so
 * they can see exactly what performers see.
 */
export async function requireTroupe(returnPath = "/troupe") {
  const user = await requireUser(returnPath, "troupe");
  if (user.role !== "PERFORMER" && user.role !== "ADMIN") {
    redirect(defaultLandingPath(user.role, "troupe"));
  }
  return user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  const hostname = await requestHostname();
  cookieStore.delete({
    name: SESSION_COOKIE,
    path: "/",
    domain: sessionCookieDomain(hostname),
  });
}
