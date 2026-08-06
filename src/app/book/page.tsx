import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book a Show",
  description:
    "Host a private live interactive murder mystery at your venue in the Dallas and Fort Worth area.",
};

export const dynamic = "force-dynamic";

const reasons = [
  {
    title: "Professional actors",
    text: "Our talented local actors bring each character to life with engaging performances.",
  },
  {
    title: "Interactive experience",
    text: "Your guests become detectives, gathering clues and solving the mystery together.",
  },
  {
    title: "Perfect for any event",
    text: "Corporate events, birthday parties, team building, or any special occasion.",
  },
  {
    title: "We come to you",
    text: "Host at your venue of choice anywhere in the Dallas and Fort Worth area.",
  },
];

export default async function BookPage() {
  const shows = await db.show.findMany({
    where: { type: { in: ["STANDARD", "ESCAPE"] }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    select: { id: true, title: true, slug: true, shortDescription: true },
  });

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Host a private show</p>
          <h1>Bring the mystery to your next event.</h1>
          <p className="hero-lead">
            Tell us a little about your event and we will be in touch to confirm
            availability and talk through the details.
          </p>
        </div>
      </section>

      <section className="page-shell">
        <div className="admin-dashboard-summary">
          {reasons.map((reason) => (
            <div key={reason.title}>
              <strong>{reason.title}</strong>
              <span>{reason.text}</span>
            </div>
          ))}
        </div>

        {shows.length ? (
          <BookingForm shows={shows} />
        ) : (
          <div className="admin-empty-state">
            <strong>Our catalog is being prepared</strong>
            <p>
              Email{" "}
              <a href="mailto:info@mysteriesinmotion.com">
                info@mysteriesinmotion.com
              </a>{" "}
              and we will talk you through what we can stage for your event.
            </p>
          </div>
        )}

        {shows.length > 0 && (
          <>
            <div className="section-heading">
              <h2>Available shows</h2>
            </div>
            <div className="case-grid">
              {shows.map((show) => (
                <article className="mystery-card" key={show.id}>
                  <div className="mystery-card-copy">
                    <h3>{show.title}</h3>
                    <p>{show.shortDescription}</p>
                    <Link className="text-link" href={`/shows/${show.slug}`}>
                      Learn more
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="admin-policy-note">
          <strong>Have questions?</strong>
          <p>
            Email us at{" "}
            <a href="mailto:info@mysteriesinmotion.com">
              info@mysteriesinmotion.com
            </a>{" "}
            and we will get straight back to you.
          </p>
        </div>
      </section>
    </>
  );
}
