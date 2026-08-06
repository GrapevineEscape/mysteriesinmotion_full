import type { Metadata } from "next";
import { CaseRoom } from "@/components/case-room";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Case Room Prototype",
};

export default async function DemoCaseRoomPage() {
  await requireAdmin();
  return <CaseRoom isAdmin />;
}

