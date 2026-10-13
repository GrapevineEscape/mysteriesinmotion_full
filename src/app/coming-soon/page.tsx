import type { Metadata } from "next";

const HOLDING_EMAIL = "russell@thegrapevineescape.com";

export const metadata: Metadata = {
  title: "Mysteries in Motion",
  description: "An interactive mystery company in Dallas–Fort Worth.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <section className="page-shell narrow-shell">
      <p className="eyebrow">Mysteries in Motion</p>
      <h1>An interactive mystery company in Dallas–Fort Worth.</h1>
      <p>
        <a href={`mailto:${HOLDING_EMAIL}`}>{HOLDING_EMAIL}</a>
      </p>
    </section>
  );
}
