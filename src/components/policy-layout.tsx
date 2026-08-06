import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./policy-layout.module.css";

type PolicySection = {
  id: string;
  label: string;
};

type PolicyLayoutProps = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: PolicySection[];
  children: ReactNode;
};

export const policyStyles = styles;

export function PolicyLayout({
  children,
  eyebrow,
  sections,
  summary,
  title,
}: PolicyLayoutProps) {
  return (
    <article className={styles.policy}>
      <header className={styles.header}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.summary}>{summary}</p>
        <p className={styles.effectiveDate}>Effective date: July 29, 2026</p>
        <p className={styles.reviewNotice}>
          <strong>Owner-review draft.</strong> This draft is for business and
          legal review before payments launch. It is not legal advice. A
          monitored support email and final legal venue still need to be
          confirmed.
        </p>
      </header>

      <nav className={styles.contents} aria-label={`${title} contents`}>
        <strong>On this page</strong>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {children}

      <aside className={styles.related}>
        <h2>Related policies</h2>
        <nav aria-label="Related policies">
          <Link href="/terms">Terms of Use</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/refund-policy">Refund &amp; Streaming Policy</Link>
          <Link href="/support">Customer Support</Link>
        </nav>
      </aside>
    </article>
  );
}
