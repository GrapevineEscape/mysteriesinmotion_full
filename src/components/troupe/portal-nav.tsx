"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavLink = {
  href: string;
  label: string;
  tour: string;
  /** The dashboard is the portal root, so it must not match every child path. */
  exact?: boolean;
};

const LINKS: NavLink[] = [
  { href: "/troupe", label: "Dashboard", tour: "dashboard", exact: true },
  { href: "/troupe/profile", label: "Profile", tour: "profile" },
  { href: "/troupe/shows", label: "Shows", tour: "shows" },
  { href: "/troupe/casting", label: "Show dates", tour: "show-dates" },
  { href: "/troupe/calendar", label: "Calendar", tour: "calendar" },
];

export function PortalNav({
  memberName,
  isAdmin,
}: {
  memberName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button
        aria-controls="portal-sidebar"
        aria-expanded={menuOpen}
        className="portal-nav-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <div
        aria-hidden="true"
        className="portal-overlay"
        data-open={menuOpen}
        onClick={() => setMenuOpen(false)}
      />
      <aside className="portal-sidebar" data-open={menuOpen} id="portal-sidebar">
        <div className="portal-brand">
          <span className="eyebrow">Troupe</span>
          <strong>Mysteries in Motion</strong>
        </div>
        <nav aria-label="Troupe portal">
          <ul className="portal-nav">
            {LINKS.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    data-tour={link.tour}
                    href={link.href}
                    // On narrow screens the sidebar covers the page, so leaving
                    // it open would hide what the performer just asked for.
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="portal-sidebar-footer">
          <p className="portal-member">{memberName}</p>
          {isAdmin && <Link href="/admin">Administration</Link>}
          <Link href="/">View public site</Link>
          <form action="/api/auth/sign-out" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </aside>
    </>
  );
}
