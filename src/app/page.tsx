import Link from "next/link";
import { BuyerFactsStrip } from "@/components/buyer-facts";
import { HostTestimonials } from "@/components/host-testimonials";
import { MysteryShowCard } from "@/components/mystery-show-card";
import { SiteImage } from "@/components/site-image";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";
import { SITE_IMAGE_SLOTS } from "@/lib/customer-images";
import { db } from "@/lib/db";
import { LIVE_EVENT_FACTS } from "@/lib/live-event-facts";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";

export const dynamic = "force-dynamic";

const pillars = [
  {
    title: "We bring the cast",
    text: "Professional local actors perform in your space — party, fundraiser, or corporate event.",
    image: SITE_IMAGE_SLOTS.homeExpectArrive,
  },
  {
    title: "Your guests investigate",
    text: "Guests gather clues, question suspects, and name the culprit before the final act.",
    image: SITE_IMAGE_SLOTS.homeExpectInvestigate,
  },
  {
    title: "An original evening",
    text: "Plots full of twists that keep everyone guessing right up to the reveal.",
    image: SITE_IMAGE_SLOTS.homeExpectReveal,
  },
];

export default async function MarketingHome() {
  const published = await db.show.findMany({
    where: { type: { in: LIVE_SHOW_TYPES }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    select: {
      slug: true,
      title: true,
      shortDescription: true,
      type: true,
      kidFriendly: true,
      coverImageUrl: true,
    },
  });
  // Prefer titles that already have dedicated cover art in the drop folder.
  const withDedicatedCover = new Set([
    "murder-for-real",
    "the-final-note",
    "round-and-round-it-goes",
  ]);
  const shows = [
    ...published.filter((show) => withDedicatedCover.has(show.slug)),
    ...published.filter((show) => !withDedicatedCover.has(show.slug)),
  ].slice(0, 3);

  return (
    <>
      <section className="hero hero-with-media">
        <div className="hero-copy">
          <p className="eyebrow">Interactive mysteries for your event</p>
          <h1>
            We bring the mystery to your next
            <span>party, fundraiser, or company.</span>
          </h1>
          <p className="hero-lead">
            Hire us for a live show in the Dallas–Fort Worth area, or for{" "}
            {BROADCAST_FACTS.name} — an online event for up to{" "}
            {BROADCAST_FACTS.guestMax} people, anywhere, coming{" "}
            {BROADCAST_FACTS.season}.
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
          <ul className="hero-facts" aria-label="At a glance">
            <li>
              <strong>DFW area</strong>
              <span>We come to your venue</span>
            </li>
            <li>
              <strong>{LIVE_EVENT_FACTS.runtime}</strong>
              <span>Typical private show</span>
            </li>
            <li>
              <strong>{LIVE_EVENT_FACTS.guestRange}</strong>
              <span>Ask us about larger groups</span>
            </li>
          </ul>
        </div>
        <div className="hero-media">
          <SiteImage
            spec={SITE_IMAGE_SLOTS.homeHero}
            alt="Live Mysteries in Motion performance at a private event"
          />
        </div>
      </section>

      <section className="section door-section" aria-label="Choose how to start">
        <div className="section-heading">
          <p className="eyebrow">Two ways in</p>
          <h2>Planning an event, or playing tonight?</h2>
        </div>
        <div className="door-grid">
          <article className="door-card">
            <p className="eyebrow">Hire us</p>
            <h3>Host an event</h3>
            <p>
              You are in the right place. A live cast at your venue, or{" "}
              {BROADCAST_FACTS.name} for a remote or hybrid group.
            </p>
            <Link className="text-link" href="#host-an-event">
              See how hosting works
            </Link>
          </article>
          <article className="door-card door-card-play">
            <p className="eyebrow">Play yourself</p>
            <h3>Play a mystery at home</h3>
            <p>
              Watch an original case, lock in your accusation, and earn your
              detective rank — no venue, no booking call.
            </p>
            <Link className="text-link" href="/mysteries">
              Browse the cases
            </Link>
          </article>
        </div>
      </section>

      <section className="section how-preview" id="host-an-event">
        <div className="section-heading">
          <p className="eyebrow">What to expect</p>
          <h2>An evening your guests help write.</h2>
        </div>
        <div className="steps expect-steps">
          {pillars.map((pillar) => (
            <article className="step-card expect-card" key={pillar.title}>
              <SiteImage spec={pillar.image} alt={pillar.title} />
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">For hosts</p>
            <h2>You host. We stage the mystery.</h2>
          </div>
          <p>
            You provide the date, venue, and guests. We bring the cast, the
            plot, and the interactive experience — suited to parties,
            fundraisers, and corporate events across {LIVE_EVENT_FACTS.geography}.
          </p>
        </div>
        <BuyerFactsStrip />
        <div className="button-row">
          <Link className="button button-ghost" href="/about">
            Learn more about us
          </Link>
          <Link className="button button-primary" href="/book">
            Request a booking
          </Link>
        </div>
      </section>

      <HostTestimonials />

      <section className="page-shell page-shell-tight">
        <p className="eyebrow">The shows</p>
        <h2>Choose your mystery.</h2>
        <div className="case-grid">
          {shows.map((show) => (
            <MysteryShowCard key={show.slug} show={show} cta="Learn more" />
          ))}
          {!shows.length && (
            <p>
              Our show catalog is being prepared.{" "}
              <Link href="/book">Get in touch</Link> and we will talk you
              through what we can stage for your event.
            </p>
          )}
        </div>
        <div className="button-row">
          <Link className="text-link" href="/shows">
            See all live shows
          </Link>
        </div>
      </section>

      <section className="section broadcast-preview">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">
              {BROADCAST_FACTS.name} · {BROADCAST_FACTS.season}
            </p>
            <h2>An online event we run for your group.</h2>
          </div>
          <p>
            Up to {BROADCAST_FACTS.guestMax} people, from anywhere. You hire us;
            we host the mystery. This is not the same as playing a case at home
            tonight.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/broadcast">
            Learn about {BROADCAST_FACTS.name}
          </Link>
          <Link className="text-link" href="/book?format=broadcast">
            Enquire for {BROADCAST_FACTS.season}
          </Link>
        </div>
      </section>

      <p className="bridge-note page-shell page-shell-tight">
        Prefer something tonight from home?{" "}
        <Link className="text-link" href="/mysteries">
          Play a mystery at home
        </Link>
      </p>
    </>
  );
}
