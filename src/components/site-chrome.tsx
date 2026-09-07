"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicSurface } from "@/lib/surface";

const BRAND = "Mysteries in Motion";

function NavLinks({
  surface,
  onNavigate,
}: {
  surface: PublicSurface;
  onNavigate?: () => void;
}) {
  if (surface === "play") {
    return (
      <>
        <Link href="/mysteries" onClick={onNavigate}>
          Cases
        </Link>
        <Link href="/how-it-works" onClick={onNavigate}>
          How It Works
        </Link>
        <Link href="/my-cases" onClick={onNavigate}>
          My Case Files
        </Link>
        <Link className="nav-quiet" href="/" onClick={onNavigate}>
          Host an event
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/shows" onClick={onNavigate}>
        Our Shows
      </Link>
      <Link href="/broadcast" onClick={onNavigate}>
        The Broadcast
      </Link>
      <Link href="/about" onClick={onNavigate}>
        About
      </Link>
      <Link className="nav-book" href="/book" onClick={onNavigate}>
        Book
      </Link>
      <Link className="nav-quiet" href="/mysteries" onClick={onNavigate}>
        Play at home
      </Link>
    </>
  );
}

export function SiteHeader({ surface }: { surface: PublicSurface }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${BRAND} home`}>
        <span className="brand-mark" aria-hidden="true">
          ?
        </span>
        <span>{BRAND}</span>
      </Link>
      <nav className="site-nav-desktop" aria-label="Main navigation">
        <NavLinks surface={surface} />
      </nav>
      <div className="site-header-actions">
        {surface === "play" && (
          <Link
            className="button button-small button-ghost header-signin"
            href="/sign-in"
          >
            Sign In
          </Link>
        )}
        <button
          type="button"
          className="nav-menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true">{open ? "✕" : "Menu"}</span>
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="site-nav-mobile"
          aria-label="Mobile navigation"
        >
          <NavLinks surface={surface} onNavigate={() => setOpen(false)} />
          {surface === "play" && (
            <Link href="/sign-in" onClick={() => setOpen(false)}>
              Sign In
            </Link>
          )}
        </nav>
      )}
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
            : "We bring interactive mysteries to your event."}
        </p>
        <p className="footer-contact">
          <a href="mailto:info@mysteriesinmotion.com">
            info@mysteriesinmotion.com
          </a>
        </p>
      </div>
      <div className="footer-links">
        {surface === "play" ? (
          <>
            <Link href="/mysteries">Cases</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/">Host an event</Link>
            <Link href="/sign-in">Sign In</Link>
          </>
        ) : (
          <>
            <Link href="/shows">Our Shows</Link>
            <Link href="/broadcast">The Broadcast</Link>
            <Link href="/about">About</Link>
            <Link href="/book">Book</Link>
            <Link href="/mysteries">Play at home</Link>
            <Link className="nav-quiet" href="/troupe/sign-in">
              Cast & staff
            </Link>
          </>
        )}
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refund-policy">Refunds</Link>
        <Link href="/support">Support</Link>
      </div>
    </footer>
  );
}
