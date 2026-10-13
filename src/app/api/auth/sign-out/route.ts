import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-origin";

export async function POST(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
}
