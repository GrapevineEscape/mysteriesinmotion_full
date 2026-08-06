import Link from "next/link";
import type { PublicSurface } from "@/lib/surface";

const BRAND = "Mysteries in Motion";

export function SiteHeader({ surface }: { surface: PublicSurface }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${BRAND} home`}>
        <span className="brand-mark" aria-hidden="true">
          ?
        </span>
        <span>{BRAND}</span>
      </Link>
      <nav aria-label="Main navigation">
        {surface === "play" ? (
          <>
            <Link href="/mysteries">Mysteries</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/my-cases">My Case Files</Link>
          </>
        ) : (
          <>
            <Link href="/shows">Our Shows</Link>
            <Link href="/about">About</Link>
            <Link href="/book">Book a Show</Link>
          </>
        )}
      </nav>
      <Link className="button button-small button-ghost" href="/sign-in">
        Sign In
      </Link>
    </header>
  );
}

export function SiteFooter({ surface }: { surface: PublicSurface }) {
  return (
    <footer className="site-footer">
      <div>
        <p className="brand footer-brand">
          <span className="brand-mark" aria-hidden="true">
            ?
          </span>
          <span>{BRAND}</span>
        </p>
        <p>
          {surface === "play"
            ? "A case to crack. A choice to make. A truth to uncover."
            : "Live interactive murder mysteries, performed for your event."}
        </p>
      </div>
      <div className="footer-links">
        {surface === "play" ? (
          <Link href="/how-it-works">How It Works</Link>
        ) : (
          <Link href="/book">Book a Show</Link>
        )}
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refund-policy">Refunds</Link>
        <Link href="/support">Support</Link>
      </div>
    </footer>
  );
}
