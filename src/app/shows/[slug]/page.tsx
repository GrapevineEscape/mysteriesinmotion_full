import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";

export const dynamic = "force-dynamic";

async function findShow(slug: string) {
  return db.show.findFirst({
    where: {
      slug,
      type: { in: LIVE_SHOW_TYPES },
      status: "PUBLISHED",
    },
    include: { roles: { orderBy: { displayOrder: "asc" } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = await findShow(slug);
  if (!show) return { title: "Show not found" };
  return { title: show.title, description: show.shortDescription };
}

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = await findShow(slug);
  if (!show) notFound();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
            {show.kidFriendly ? " · Family friendly" : ""}
          </p>
          <h1>{show.title}</h1>
          <p className="hero-lead">{show.shortDescription}</p>
          <div className="button-row">
            <Link className="button button-primary" href="/book">
              Book this show
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <h2>About the show</h2>
        <p className="page-intro">{show.fullDescription}</p>

        <h3>Show details</h3>
        <ul>
          <li>
            <strong>Type:</strong>{" "}
            {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
          </li>
          <li>
            <strong>Suitable for children:</strong>{" "}
            {show.kidFriendly ? "Yes" : "No"}
          </li>
          <li>
            <strong>Number of characters:</strong> {show.roles.length}
          </li>
          {show.ageRecommendation && (
            <li>
              <strong>Recommended for:</strong> {show.ageRecommendation}
            </li>
          )}
          {show.contentAdvisory && (
            <li>
              <strong>Content advisory:</strong> {show.contentAdvisory}
            </li>
          )}
        </ul>

        {show.roles.length > 0 && (
          <>
            <h2>The characters</h2>
            <div className="case-grid">
              {show.roles.map((role) => (
                <article className="mystery-card" key={role.id}>
                  <div className="mystery-card-copy">
                    <h3>{role.name}</h3>
                    <p>{role.description}</p>
                    <p className="card-kicker">
                      {role.gender} · {role.age}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="section-heading">
          <h2>Ready to host this mystery?</h2>
          <p>
            Book {show.title} for your next event and prepare for an
            unforgettable evening.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/book">
            Book now
          </Link>
        </div>
      </section>
    </>
  );
}
