import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

type AccessMember = {
  id: string;
  role: UserRole;
  showAccessRestricted: boolean;
};

/**
 * null means the member may see every show. An array, even an empty one,
 * is the exact set a restricted performer may open.
 */
export async function allowedShowIds(member: AccessMember) {
  if (member.role === "ADMIN" || !member.showAccessRestricted) return null;
  const grants = await db.performerShowAccess.findMany({
    where: { userId: member.id },
    select: { showId: true },
  });
  return grants.map((grant) => grant.showId);
}

export function canSeeShow(allowed: string[] | null, showId: string) {
  return allowed === null || allowed.includes(showId);
}

/** What accepting an invitation should store on the performer. */
export function accessGrantForInvite(
  role: "PERFORMER" | "ADMIN",
  showIds: string[],
) {
  if (role === "ADMIN") return { restricted: false, showIds: [] as string[] };
  return { restricted: true, showIds };
}
