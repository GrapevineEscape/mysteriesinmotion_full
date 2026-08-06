"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavLink = { href: string; label: string; exact?: boolean };

const SECTIONS: Array<{ heading: string; links: NavLink[] }> = [
  {
    heading: "Overview",
    links: [{ href: "/admin", label: "Dashboard", exact: true }],
  },
  {
    heading: "Catalog",
    links: [{ href: "/admin/catalog", label: "Shows and roles" }],
  },
  {
    heading: "Live operations",
    links: [
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/show-dates", label: "Show dates" },
      { href: "/admin/casting", label: "Casting boards" },
      { href: "/admin/applications", label: "Roster requests" },
      { href: "/admin/bookings", label: "Booking enquiries" },
      { href: "/admin/performers", label: "Performers" },
    ],
  },
  {
    heading: "Online mysteries",
    links: [{ href: "/admin/online", label: "Case configuration" }],
  },
  {
    heading: "Business",
    links: [
      { href: "/admin/business", label: "Reporting" },
      { href: "/admin/customers", label: "Customer support" },
      { href: "/admin/troupe", label: "Troupe access" },
    ],
  },
];

/**
 * A director reaches administration only for the casting boards of the
 * performances assigned to them, so the rest of the sections are not offered.
 */
const DIRECTOR_LINKS = ["/admin/casting"];

export function AdminNav({
  memberName,
  isAdmin,
}: {
  memberName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = isAdmin
    ? SECTIONS
    : SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter((link) => DIRECTOR_LINKS.includes(link.href)),
      })).filter((section) => section.links.length > 0);

  return (
    <>
      <button
        aria-controls="admin-sidebar"
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
      <aside className="portal-sidebar" data-open={menuOpen} id="admin-sidebar">
        <div className="portal-brand">
          <span className="eyebrow">Administration</span>
          <strong>Mysteries in Motion</strong>
        </div>
        <nav aria-label="Administration">
          {sections.map((section) => (
            <div className="portal-nav-group" key={section.heading}>
              <p>{section.heading}</p>
              <ul className="portal-nav">
                {section.links.map((link) => {
                  const active = link.exact
                    ? pathname === link.href
                    : pathname.startsWith(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <p className="portal-member">{memberName}</p>
          <Link href="/troupe">Troupe portal</Link>
          <Link href="/">View public site</Link>
          <form action="/api/auth/sign-out" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </aside>
    </>
  );
}
