import type { Metadata } from "next";
import Link from "next/link";
import { BuyerFactsStrip } from "@/components/buyer-facts";
import { HostTestimonials } from "@/components/host-testimonials";
import { MysteryShowCard } from "@/components/mystery-show-card";
import { SiteImage } from "@/components/site-image";
import { SITE_IMAGE_SLOTS } from "@/lib/customer-images";
import { db } from "@/lib/db";
import { LIVE_EVENT_FACTS } from "@/lib/live-event-facts";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book a Show",
  description:
    "Host a private live mystery at your DFW venue, or enquire about The Broadcast for an online group event.",
};

export const dynamic = "force-dynamic";

const reasons = [
  {
    title: "Professional actors",
    text: "Local actors bring each character to life at your venue.",
  },
  {
    title: "Interactive evening",
    text: "Guests become detectives, gather clues, and name the culprit.",
  },
  {
    title: "Any occasion",
    text: "Corporate events, birthdays, team building, or celebrations.",
  },
  {
    title: "We come to you — or we go online",
    text: `Live shows in ${LIVE_EVENT_FACTS.geography}. The Broadcast is online, from anywhere, coming Fall 2026.`,
  },
];

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; format?: string }>;
}) {
  const { show: showSlug, format } = await searchParams;
  const defaultFormat = format === "broadcast" ? "broadcast" : "live";

  const shows = await db.show.findMany({
    where: { type: { in: LIVE_SHOW_TYPES }, status: "PUBLISHED" },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      type: true,
      kidFriendly: true,
      coverImageUrl: true,
    },
  });

  const defaultShowId =
    shows.find((entry) => entry.slug === showSlug)?.id ?? "";

  return (
    <>
      <section className="hero hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">Host a private show</p>
          <h1>Bring the mystery to your next event.</h1>
          <p className="hero-lead">
            Tell us about your event — a live show at your venue, or The
            Broadcast for an online group. We typically reply within{" "}
            {LIVE_EVENT_FACTS.replyWindow} to confirm availability and talk
            through shows and rates.
          </p>
        </div>
      </section>

      <section className="page-shell page-shell-tight">
        <div className="book-trust-strip">
          <SiteImage spec={SITE_IMAGE_SLOTS.bookTrust1} />
          <SiteImage spec={SITE_IMAGE_SLOTS.bookTrust2} />
          <p className="book-trust-note">
            {LIVE_EVENT_FACTS.runtime} · {LIVE_EVENT_FACTS.guestRange} ·{" "}
            {LIVE_EVENT_FACTS.geography}. {LIVE_EVENT_FACTS.rateBand}.
          </p>
        </div>

        <BuyerFactsStrip />

        <div className="book-reasons">
          {reasons.map((reason) => (
            <article key={reason.title}>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </article>
          ))}
        </div>

        <BookingForm
          defaultFormat={defaultFormat}
          defaultShowId={defaultShowId}
          shows={shows.map(({ id, title, slug }) => ({ id, title, slug }))}
        />

        <HostTestimonials />

        {shows.length > 0 && (
          <>
            <div className="section-heading">
              <h2>Available shows</h2>
            </div>
            <div className="case-grid">
              {shows.map((show) => (
                <MysteryShowCard key={show.id} show={show} cta="Learn more" />
              ))}
            </div>
          </>
        )}

        <div className="support-note">
          <strong>Have questions?</strong>
          <p>
            Email{" "}
            <a href="mailto:info@mysteriesinmotion.com">
              info@mysteriesinmotion.com
            </a>
            . We typically reply within {LIVE_EVENT_FACTS.replyWindow}. Or{" "}
            <Link href="/shows">browse the shows</Link> first.
          </p>
        </div>
      </section>
    </>
  );
}
