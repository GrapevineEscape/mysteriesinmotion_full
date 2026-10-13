import type { Metadata } from "next";

const HOLDING_EMAIL = "info@mysteriesinmotion.com";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "An interactive mystery company in Dallas–Fort Worth.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <section className="page-shell narrow-shell">
      <p className="eyebrow">Mysteries in Motion</p>
      <h1>Something suspicious is being prepared.</h1>
      <p className="page-intro">
        Our new site is nearly ready. In the meantime, our troupe is still
        booking live interactive murder mysteries for parties, fundraisers, and
        corporate events.
      </p>
      <p>
        To inquire about a performance, email{" "}
        <a href={`mailto:${HOLDING_EMAIL}`}>{HOLDING_EMAIL}</a>.
      </p>
    </section>
  );
}
