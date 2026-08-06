import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Mysteries",
};

export const dynamic = "force-dynamic";

const steps = [
  {
    number: "01",
    title: "Watch the case",
    text: "Meet the suspects, follow the performance, and watch closely for the clues hiding in plain sight.",
  },
  {
    number: "02",
    title: "Make your accusation",
    text: "Choose who did it and explain the motive and evidence before the final reveal unlocks.",
  },
  {
    number: "03",
    title: "Earn your rank",
    text: "Watch the conclusion and discover whether you are a Super Sleuth or a Bumbling Detective.",
  },
];

export default async function MysteriesPage() {
  const mysteries = await db.show.findMany({
    where: { type: "ONLINE", status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    include: { online: { select: { priceCents: true } } },
  });

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Interactive mysteries you play at home</p>
          <h1>
            Everyone has a story.
            <span>Someone has a secret.</span>
          </h1>
          <p className="hero-lead">
            Watch an original mystery performance, study the suspects, lock in
            your accusation, and see whether your detective instincts were
            right.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="#case-board">
              Browse the cases
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/how-it-works">
              See how it works
            </Link>
          </div>
          <ul className="hero-facts" aria-label="Experience details">
            <li>
              <strong>48-hour replay</strong>
              <span>After your first stream</span>
            </li>
            <li>
              <strong>
                {mysteries.length} {mysteries.length === 1 ? "mystery" : "mysteries"}
              </strong>
              <span>More cases ahead</span>
            </li>
            <li>
              <strong>Your verdict</strong>
              <span>Your detective rank</span>
            </li>
          </ul>
        </div>
        <div className="case-file" aria-label="Confidential case file preview">
          <div className="case-file-tab">Case file 001</div>
          <div className="case-stamp">Confidential</div>
          <div className="case-photo">
            <span className="photo-silhouette" aria-hidden="true" />
            <p>Identity withheld</p>
          </div>
          <div className="case-lines">
            <span />
            <span />
            <span />
          </div>
          <p className="case-note">
            The evidence is ready.
            <br />
            Are you?
          </p>
        </div>
      </section>

      <section className="section how-preview">
        <div className="section-heading">
          <p className="eyebrow">The investigation</p>
          <h2>Three steps. One final answer.</h2>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell" id="case-board">
        <p className="eyebrow">The case board</p>
        <h2>Choose your mystery.</h2>
        <p className="page-intro">
          Each show is a complete investigation you can play at home.
        </p>
        <div className="case-grid">
          {mysteries.map((mystery) => (
            <article className="mystery-card placeholder-card" key={mystery.slug}>
              <div className="mystery-art">
                <span>Case {String(mystery.displayOrder).padStart(2, "0")}</span>
                <strong>Classified</strong>
              </div>
              <div className="mystery-card-copy">
                <p className="card-kicker">
                  ${((mystery.online?.priceCents ?? 0) / 100).toFixed(2)} per show
                </p>
                <h3>{mystery.title}</h3>
                <p>{mystery.fullDescription}</p>
                <Link
                  className="button button-primary"
                  href={`/mysteries/${mystery.slug}`}
                >
                  View case details
                </Link>
              </div>
            </article>
          ))}
          {!mysteries.length && (
            <p>No mysteries are published yet. Please check back soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
