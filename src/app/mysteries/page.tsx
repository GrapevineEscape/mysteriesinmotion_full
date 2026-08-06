import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Mysteries",
};

export const dynamic = "force-dynamic";

export default async function MysteriesPage() {
  const mysteries = await db.show.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return (
    <section className="page-shell">
      <p className="eyebrow">The case board</p>
      <h1>Choose your mystery.</h1>
      <p className="page-intro">
        Choose from three original online mysteries. Each show is a complete
        investigation available for $10.
      </p>
      <div className="case-grid">
        {mysteries.map((mystery) => (
          <article className="mystery-card placeholder-card" key={mystery.slug}>
            <div className="mystery-art">
              <span>Case {String(mystery.displayOrder).padStart(2, "0")}</span>
              <strong>Classified</strong>
            </div>
            <div className="mystery-card-copy">
              <p className="card-kicker">$10 per show</p>
              <h2>{mystery.title}</h2>
              <p>{mystery.fullDescription}</p>
              <Link className="button button-primary" href={`/mysteries/${mystery.slug}`}>
                View case details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
