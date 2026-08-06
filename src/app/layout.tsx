import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Online Mystery",
    template: "%s | Online Mystery",
  },
  description:
    "Watch the mystery, examine the clues, submit your accusation, and discover your detective rating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Online Mystery home">
            <span className="brand-mark" aria-hidden="true">
              ?
            </span>
            <span>Online Mystery</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/mysteries">Mysteries</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/my-cases">My Case Files</Link>
          </nav>
          <Link className="button button-small button-ghost" href="/sign-in">
            Sign In
          </Link>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <p className="brand footer-brand">
              <span className="brand-mark" aria-hidden="true">
                ?
              </span>
              <span>Online Mystery</span>
            </p>
            <p>A case to crack. A choice to make. A truth to uncover.</p>
          </div>
          <div className="footer-links">
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refunds</Link>
            <Link href="/support">Support</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

