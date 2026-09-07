import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageSlot } from "@/components/image-slot";
import { SiteImage } from "@/components/site-image";
import { SITE_IMAGE_SLOTS, showCoverSpec } from "@/lib/customer-images";
import { LIVE_EVENT_FACTS } from "@/lib/live-event-facts";
import { resolveShowCover } from "@/lib/resolve-customer-image";
import { db } from "@/lib/db";
import { LIVE_SHOW_TYPES } from "@/lib/show-types";

export const dynamic = "force-dynamic";

/** One short guest-facing line — no casting metadata. */
function guestFacingTeaser(description: string | null | undefined) {
  const text = (description ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "A guest your party will meet during the evening.";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return sentence.length > 140 ? `${sentence.slice(0, 137).trim()}…` : sentence;
}

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

  const bookHref = `/book?show=${encodeURIComponent(show.slug)}`;
  const gallery = [
    SITE_IMAGE_SLOTS.showGallery1,
    SITE_IMAGE_SLOTS.showGallery2,
    SITE_IMAGE_SLOTS.showGallery3,
  ];

  return (
    <>
      <section className="hero hero-with-media hero-show-detail">
        <div className="hero-copy">
          <p className="eyebrow">
            {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
            {show.kidFriendly ? " · Family friendly" : ""}
          </p>
          <h1>{show.title}</h1>
          <p className="hero-lead">{show.shortDescription}</p>
          <div className="button-row">
            <Link className="button button-primary" href={bookHref}>
              Book this show
            </Link>
          </div>
        </div>
        <div className="hero-media">
          <ImageSlot
            fill
            candidates={[resolveShowCover(show.slug, show.coverImageUrl)]}
            spec={showCoverSpec(show.slug, show.title)}
            alt={`${show.title} cover`}
          />
        </div>
      </section>

      <section className="page-shell page-shell-tight">
        <h2>About the show</h2>
        <p className="page-intro">{show.fullDescription}</p>

        <h3>At a glance</h3>
        <ul className="show-fact-list">
          <li>
            <strong>Type:</strong>{" "}
            {show.type === "ESCAPE" ? "Escape mystery" : "Live mystery"}
          </li>
          <li>
            <strong>Runtime:</strong> {LIVE_EVENT_FACTS.runtime}
          </li>
          <li>
            <strong>Guest count:</strong> {LIVE_EVENT_FACTS.guestRange}
          </li>
          <li>
            <strong>Characters on stage:</strong> {show.roles.length}
          </li>
          <li>
            <strong>Space:</strong> {LIVE_EVENT_FACTS.space}
          </li>
          <li>
            <strong>Lead time:</strong> {LIVE_EVENT_FACTS.leadTime}
          </li>
          <li>
            <strong>Area:</strong> {LIVE_EVENT_FACTS.geography}
          </li>
          <li>
            <strong>Suitable for children:</strong>{" "}
            {show.kidFriendly ? "Yes" : "No"}
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
        <p className="page-intro">
          <strong>Rates:</strong> {LIVE_EVENT_FACTS.rateBand}.{" "}
          {LIVE_EVENT_FACTS.travel}.
        </p>

        <h3>From the evening</h3>
        <div className="show-gallery">
          {gallery.map((spec) => (
            <SiteImage key={spec.id} spec={spec} />
          ))}
        </div>

        {show.roles.length > 0 && (
          <>
            <h2>Meet the characters</h2>
            <p className="page-intro">
              A taste of who your guests will meet — no spoilers.
            </p>
            <div className="character-grid">
              {show.roles.map((role) => (
                <article className="character-card" key={role.id}>
                  <h3>{role.name}</h3>
                  <p>{guestFacingTeaser(role.description)}</p>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="section-heading">
          <h2>Ready to host this mystery?</h2>
          <p>
            Request {show.title} for your next event. We typically reply within{" "}
            {LIVE_EVENT_FACTS.replyWindow} to confirm availability and talk
            through the details.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href={bookHref}>
            Book now
          </Link>
        </div>
      </section>
    </>
  );
}
