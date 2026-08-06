import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", `/troupe/shows/${slug}`);
    return NextResponse.redirect(signIn, 303);
  }

  const show = await db.show.findUnique({
    where: { slug },
    select: { title: true, scriptUrl: true },
  });

  if (!show?.scriptUrl) {
    return NextResponse.redirect(new URL("/troupe/shows", request.url), 303);
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
