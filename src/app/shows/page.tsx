import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Our Shows",
  description:
    "Choose from our collection of live interactive mystery shows for your next event.",
};

export const dynamic = "force-dynamic";

export default async function ShowsPage() {
  const shows = await db.show.findMany({
    where: { type: { in: ["STANDARD", "ESCAPE"] }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { roles: true } } },
  });

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Our mystery shows</p>
          <h1>Choose the case for your event.</h1>
          <p className="hero-lead">
            Every show is a complete evening of live theatre in which your
            guests gather the clues and name the culprit.
          </p>
        </div>
      </section>

      <section className="page-shell">
        <div className="case-grid">
          {shows.map((show) => (
            <article className="mystery-card" key={show.slug}>
              <div className="mystery-card-copy">
                <p className="card-kicker">
                  {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
                  {show.kidFriendly ? " · Family friendly" : ""}
                </p>
                <h2>{show.title}</h2>
                <p>{show.shortDescription}</p>
                <p className="card-kicker">
                  {show._count.roles}{" "}
                  {show._count.roles === 1 ? "character" : "characters"}
                </p>
                <Link
                  className="button button-primary"
                  href={`/shows/${show.slug}`}
                >
                  View details
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!shows.length && (
          <div className="admin-empty-state">
            <strong>Our catalog is being prepared</strong>
            <p>
              Please <Link href="/book">get in touch</Link> and we will talk you
              through what we can stage for your event.
            </p>
          </div>
        )}

        <div className="section-heading">
          <h2>Ready to host a mystery?</h2>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/book">
            Book a show
          </Link>
        </div>
      </section>
    </>
  );
}
