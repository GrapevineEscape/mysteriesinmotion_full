import type { Metadata } from "next";
import { requireTroupe } from "@/lib/auth";
import { PortalNav } from "@/components/troupe/portal-nav";
import { displayName } from "@/lib/people";

export const metadata: Metadata = {
  title: { default: "Troupe", template: "%s | Troupe" },
};

export default async function TroupeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireTroupe();

  return (
    <div className="portal-shell">
      <PortalNav
        isAdmin={member.role === "ADMIN"}
        memberName={displayName(member)}
      />
      <div className="portal-main">{children}</div>
    </div>
  );
}
