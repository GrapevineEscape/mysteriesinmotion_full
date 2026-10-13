"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { PublicSurface } from "@/lib/surface";

const BRAND = "Mysteries in Motion";

const PRODUCTS = [
  { href: "/shows", label: "Private shows", kind: "live" },
  { href: "/broadcast", label: "The Broadcast", kind: "broadcast" },
  { href: "/mysteries", label: "Play now", kind: "play" },
] as const;

function productIsCurrent(pathname: string, kind: (typeof PRODUCTS)[number]["kind"]) {
  if (kind === "live") return pathname === "/shows" || pathname.startsWith("/shows/");
  if (kind === "broadcast") return pathname === "/broadcast" || pathname.startsWith("/broadcast/");
  return (
    pathname === "/mysteries" ||
    pathname.startsWith("/mysteries/") ||
    pathname.startsWith("/play/") ||
    pathname === "/how-it-works" ||
    pathname === "/my-cases" ||
    pathname === "/sign-in"
  );
}

function NavLinks({
  surface,
  pathname,
  onNavigate,
}: {
  surface: PublicSurface;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {PRODUCTS.map((product) => (
        <Link
          key={product.href}
          className={`nav-product nav-product-${product.kind}${productIsCurrent(pathname, product.kind) ? " is-current" : ""}`}
          href={product.href}
          aria-current={productIsCurrent(pathname, product.kind) ? "page" : undefined}
          onClick={onNavigate}
        >
          {product.label}
        </Link>
      ))}
      {surface === "play" ? (
        <>
          <Link href="/how-it-works" onClick={onNavigate}>
            How it works
          </Link>
          <Link href="/my-cases" onClick={onNavigate}>
            My case files
          </Link>
        </>
      ) : (
        <Link
          href="/about"
          aria-current={pathname === "/about" ? "page" : undefined}
          onClick={onNavigate}
        >
          About
        </Link>
      )}
    </>
  );
}

export function SiteHeader({
  surface,
  holding = false,
}: {
  surface: PublicSurface;
  holding?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${BRAND} home`}>
        <span className="brand-mark" aria-hidden="true">
          ?
        </span>
        <span>{BRAND}</span>
      </Link>
      {holding ? null : (
        <nav className="site-nav-desktop" aria-label="Main navigation">
          <NavLinks surface={surface} pathname={pathname} />
        </nav>
      )}
      {holding ? null : (
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
      )}
      {open && !holding && (
        <nav
          id="mobile-nav"
          className="site-nav-mobile"
          aria-label="Mobile navigation"
        >
          <NavLinks surface={surface} pathname={pathname} onNavigate={() => setOpen(false)} />
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

export function SiteFooter({
  surface,
  holding = false,
}: {
  surface: PublicSurface;
  holding?: boolean;
}) {
  if (holding) return null;

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
            : "An interactive mystery company in Dallas–Fort Worth."}
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
            <Link href="/mysteries">Play now</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/my-cases">My case files</Link>
            <Link href="/shows">Private shows</Link>
            <Link href="/broadcast">The Broadcast</Link>
            <Link href="/sign-in">Sign In</Link>
          </>
        ) : (
          <>
            <Link href="/shows">Private shows</Link>
            <Link href="/broadcast">The Broadcast</Link>
            <Link href="/mysteries">Play now</Link>
            <Link href="/about">About</Link>
            <Link href="/book">Book</Link>
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
