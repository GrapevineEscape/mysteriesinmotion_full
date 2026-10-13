import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser, requireTroupe } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { displayName } from "@/lib/people";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | Administration" },
};

/**
 * Membership of the troupe is the floor for reaching administration at all.
 * Each page then requires an administrator, except the casting board, which a
 * director may open for the performances assigned to them.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // An unsigned visit should look like a missing page. Staff reach this
  // area after signing in at /troupe/sign-in.
  const user = await currentUser();
  if (!user) notFound();

  const member = await requireTroupe("/admin");

  return (
    <div className="portal-shell">
      <AdminNav isAdmin={member.role === "ADMIN"} memberName={displayName(member)} />
      <div className="portal-main">{children}</div>
    </div>
  );
}
