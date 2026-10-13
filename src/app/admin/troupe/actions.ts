"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTroupeInvite } from "@/lib/email";
import { createTroupeInvite, revokeTroupeInvite } from "@/lib/troupe-invites";

function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "https://mysteriesinmotion.com";
}

export async function inviteTroupeMember(formData: FormData) {
  const admin = await requireAdmin();
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("An email address is required.");
  }
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "PERFORMER";

  const { invite } = await createTroupeInvite({
    email,
    role,
    createdById: admin.id,
  });

  await sendTroupeInvite({
    email: invite.email,
    signInUrl: `${appUrl()}/troupe/sign-in?next=${encodeURIComponent("/troupe")}`,
    expiresAt: invite.expiresAt,
    role: invite.role === "ADMIN" ? "ADMIN" : "PERFORMER",
  });

  revalidatePath("/admin/troupe");
}

export async function cancelTroupeInvite(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("An invitation is required.");
  await revokeTroupeInvite(id);
  revalidatePath("/admin/troupe");
}

export async function changeMemberRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id");
  const role = formData.get("role");
  if (typeof id !== "string") throw new Error("A member is required.");
  if (role !== "CUSTOMER" && role !== "PERFORMER" && role !== "ADMIN") {
    throw new Error("That role is not recognised.");
  }
  // Removing your own administrator access would lock you out of this screen.
  if (id === admin.id && role !== "ADMIN") {
    throw new Error("You cannot change your own administrator access.");
  }

  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/troupe");
}
