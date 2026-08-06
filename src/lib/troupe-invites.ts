import { createHash, randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import { normalizeEmail } from "@/lib/auth";
import { db } from "@/lib/db";

const INVITE_DAYS = 30;

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues an invitation that upgrades an account to troupe access the first time
 * that email address signs in. Any earlier unclaimed invitation for the same
 * address is retired so only the newest one can be claimed.
 */
export async function createTroupeInvite({
  email: emailInput,
  role = "PERFORMER",
  createdById,
}: {
  email: string;
  role?: Extract<UserRole, "PERFORMER" | "ADMIN">;
  createdById?: string;
}) {
  const email = normalizeEmail(emailInput);
  if (!email.includes("@")) {
    throw new Error("A valid email address is required.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);

  const invite = await db.$transaction(async (transaction) => {
    await transaction.troupeInvite.updateMany({
      where: { email, acceptedAt: null },
      data: { expiresAt: new Date() },
    });
    return transaction.troupeInvite.create({
      data: {
        email,
        role,
        tokenHash: hashInviteToken(token),
        expiresAt,
        createdById,
      },
    });
  });

  return { invite, token };
}

export async function revokeTroupeInvite(id: string) {
  await db.troupeInvite.updateMany({
    where: { id, acceptedAt: null },
    data: { expiresAt: new Date() },
  });
}

export async function pendingTroupeInvites() {
  return db.troupeInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { email: true, displayName: true } } },
  });
}
