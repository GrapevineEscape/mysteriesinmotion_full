import type { Metadata } from "next";
import Link from "next/link";
import { BuyerFactsStrip } from "@/components/buyer-facts";
import { MysteryShowCard } from "@/components/mystery-show-card";
import { db } from "@/lib/db";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";

export const metadata: Metadata = {
  title: "Our Shows",
  description:
    "Choose from our collection of live interactive mystery shows for your next event in Dallas–Fort Worth.",
};

export const dynamic = "force-dynamic";

export default async function ShowsPage() {
  const shows = await db.show.findMany({
    where: { type: { in: LIVE_SHOW_TYPES }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { roles: true } } },
  });

  return (
    <>
      <section className="hero hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">Our mystery shows</p>
          <h1>Choose the case for your event.</h1>
          <p className="hero-lead">
            Every show is a complete evening of live theatre in which your
            guests gather the clues and name the culprit.
          </p>
        </div>
      </section>

      <section className="page-shell page-shell-tight">
        <BuyerFactsStrip compact />

        <div className="case-grid">
          {shows.map((show) => (
            <MysteryShowCard
              key={show.slug}
              show={{
                slug: show.slug,
                title: show.title,
                shortDescription: show.shortDescription,
                type: show.type,
                kidFriendly: show.kidFriendly,
                coverImageUrl: show.coverImageUrl,
                characterCount: show._count.roles,
              }}
            />
          ))}
        </div>

        {!shows.length && (
          <div className="empty-state">
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
