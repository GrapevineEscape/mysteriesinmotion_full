import Link from "next/link";
import { db } from "@/lib/db";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";

export const dynamic = "force-dynamic";

const pillars = [
  {
    title: "Live actors",
    text: "Immersive performances from talented local actors who bring each mystery to life in your space.",
  },
  {
    title: "Interactive",
    text: "Your guests become part of the story, gathering clues, questioning suspects, and naming the culprit.",
  },
  {
    title: "Original stories",
    text: "Plots full of twists and surprises that keep everyone guessing right up to the final act.",
  },
];

export default async function MarketingHome() {
  const shows = await db.show.findMany({
    where: { type: { in: LIVE_SHOW_TYPES }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    take: 3,
  });

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Live interactive murder mysteries</p>
          <h1>
            Theatrical mysteries to solve
            <span>without leaving the house.</span>
          </h1>
          <p className="hero-lead">
            Solving interactive mysteries, one crime at a time. We bring a full
            cast to your party, fundraiser, or corporate event in the Dallas and
            Fort Worth area.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/book">
              Host a private show
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/shows">
              Browse our shows
            </Link>
          </div>
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
          <p className="eyebrow">What to expect</p>
          <h2>An evening your guests help write.</h2>
        </div>
        <div className="steps">
          {pillars.map((pillar) => (
            <article className="step-card" key={pillar.title}>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Welcome, super sleuths</p>
            <h2>Mysteries in Motion welcomes you to the fun.</h2>
          </div>
          <p>
            Your role is to observe carefully and gather clues, working out who
            might be lying and who only seems innocent. At the intermission you
            name the culprit, then the final act reveals whether your suspicions
            were correct.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-ghost" href="/about">
            Learn more about us
          </Link>
        </div>
      </section>

      <section className="page-shell">
        <p className="eyebrow">The shows</p>
        <h2>Choose your mystery.</h2>
        <div className="case-grid">
          {shows.map((show) => (
            <article className="mystery-card" key={show.slug}>
              <div className="mystery-card-copy">
                <p className="card-kicker">
                  {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
                  {show.kidFriendly ? " · Family friendly" : ""}
                </p>
                <h3>{show.title}</h3>
                <p>{show.shortDescription}</p>
                <Link
                  className="button button-primary"
                  href={`/shows/${show.slug}`}
                >
                  Learn more
                </Link>
              </div>
            </article>
          ))}
          {!shows.length && (
            <p>
              Our show catalog is being prepared.{" "}
              <Link href="/book">Get in touch</Link> and we will talk you
              through what we can stage for your event.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
