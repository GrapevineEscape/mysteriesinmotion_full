import type { Metadata } from "next";
import Link from "next/link";
import { ImageSlot } from "@/components/image-slot";
import { SiteImage } from "@/components/site-image";
import { SITE_IMAGE_SLOTS, showCoverSpec } from "@/lib/customer-images";
import { resolveShowCover } from "@/lib/resolve-customer-image";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Play at home",
  description:
    "Interactive mysteries you play at home — watch, accuse, and earn your detective rank.",
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
      <section className="hero hero-with-media">
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
                {mysteries.length}{" "}
                {mysteries.length === 1 ? "mystery" : "mysteries"}
              </strong>
              <span>Play when you are ready</span>
            </li>
            <li>
              <strong>Your verdict</strong>
              <span>Your detective rank</span>
            </li>
          </ul>
        </div>
        <div className="hero-media">
          <SiteImage
            spec={SITE_IMAGE_SLOTS.onlineHero}
            alt="Online mystery Case Room"
          />
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
        <p className="bridge-note">
          Planning an event instead?{" "}
          <Link className="text-link" href="/">
            Host a mystery with us
          </Link>
        </p>
      </section>

      <section className="page-shell page-shell-tight" id="case-board">
        <p className="eyebrow">The case board</p>
        <h2>Choose your mystery.</h2>
        <p className="page-intro">
          Each show is a complete investigation you can play at home.
        </p>
        <div className="case-grid">
          {mysteries.map((mystery) => (
            <article className="mystery-card" key={mystery.slug}>
              <div className="mystery-card-media">
                <ImageSlot
                  fill
                  candidates={[
                    resolveShowCover(mystery.slug, mystery.coverImageUrl),
                  ]}
                  spec={showCoverSpec(mystery.slug, mystery.title)}
                  alt={`${mystery.title} cover`}
                />
              </div>
              <div className="mystery-card-copy">
                <p className="card-kicker">
                  ${((mystery.online?.priceCents ?? 0) / 100).toFixed(2)} per
                  show · Play at home
                </p>
                <h3>{mystery.title}</h3>
                <p>{mystery.shortDescription}</p>
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
