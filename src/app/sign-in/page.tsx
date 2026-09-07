import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { isTroupeReturnPath, optionalReturnPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = optionalReturnPath(next);
  if (isTroupeReturnPath(nextPath)) {
    redirect(`/troupe/sign-in?next=${encodeURIComponent(nextPath!)}`);
  }

  return (
    <section className="page-shell sign-in-shell">
      <div className="sign-in-card">
        <p className="eyebrow">Play at home</p>
        <h1>Sign in to your cases.</h1>
        <p>
          No password to remember. We will send a secure, time-limited code to
          your inbox. This is for mysteries you play at home — not for hiring
          us to perform.
        </p>
        <SignInForm audience="play" nextPath={nextPath} />
        <p className="bridge-note">
          Planning an event instead?{" "}
          <Link className="text-link" href="/book">
            Request a booking
          </Link>
          . No account needed.
        </p>
      </div>
    </section>
  );
}
