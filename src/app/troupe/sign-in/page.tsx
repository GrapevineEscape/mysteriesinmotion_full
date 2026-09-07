import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { optionalReturnPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cast & staff sign in",
  robots: { index: false, follow: false },
};

export default async function TroupeSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <section className="page-shell sign-in-shell">
      <div className="sign-in-card">
        <p className="brand">Mysteries in Motion</p>
        <p className="eyebrow">Cast & staff</p>
        <h1>Sign in to the troupe portal.</h1>
        <p>
          For actors, directors, and administrators. You need an invitation —
          this is not the door for playing a mystery at home, and hosts do not
          need an account to book a show. If you were invited, you will receive
          a code.
        </p>
        <SignInForm
          audience="troupe"
          nextPath={optionalReturnPath(next) ?? "/troupe"}
        />
        <p className="bridge-note">
          Playing a mystery with your family?{" "}
          <Link className="text-link" href="/sign-in">
            Sign in to your cases
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
