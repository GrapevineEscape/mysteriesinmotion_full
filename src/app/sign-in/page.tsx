import type { Metadata } from "next";
import { optionalReturnPath } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <section className="page-shell sign-in-shell">
      <div className="sign-in-card">
        <p className="eyebrow">Mysteries in Motion</p>
        <h1>Sign in by email.</h1>
        <p>
          No password to remember. We will send a secure, time-limited code to
          your inbox. The same sign-in works for online mysteries and for the
          troupe portal.
        </p>
        <SignInForm nextPath={optionalReturnPath(next)} />
      </div>
    </section>
  );
}
