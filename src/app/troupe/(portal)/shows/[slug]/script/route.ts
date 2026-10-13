import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicOrigin } from "@/lib/public-origin";
import { allowedShowIds, canSeeShow } from "@/lib/show-access";
import { secureR2Download } from "@/lib/cloudflare-r2";

/**
 * Scripts are unpublished work, so they are never served from a guessable
 * public path. Troupe membership is checked here and the reader is handed a
 * short-lived signed URL rather than the object itself.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await currentUser();

  if (!user || (user.role !== "PERFORMER" && user.role !== "ADMIN")) {
    const signIn = new URL("/troupe/sign-in", publicOrigin(request));
    signIn.searchParams.set("next", `/troupe/shows/${slug}`);
    return NextResponse.redirect(signIn, 303);
  }

  const show = await db.show.findUnique({
    where: { slug },
    select: { id: true, title: true, scriptUrl: true },
  });

  const allowed = await allowedShowIds(user);
  if (!show || !canSeeShow(allowed, show.id) || !show.scriptUrl) {
    return NextResponse.redirect(new URL("/troupe/shows", publicOrigin(request)), 303);
  }

  const url = await secureR2Download(show.scriptUrl, `${show.title} script.pdf`);
  if (!url) {
    return new NextResponse(
      "The script could not be opened. Please tell an administrator.",
      { status: 502 },
    );
  }

  return NextResponse.redirect(url, 303);
}
