import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage } from "@/components/site-image";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";
import { SITE_IMAGE_SLOTS } from "@/lib/customer-images";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Mysteries in Motion is the company you hire for a mystery event in DFW — or for The Broadcast online. You can also play a case at home.",
};

const offerings = [
  {
    eyebrow: "Hire us",
    title: "Live at your venue",
    text: "We bring professional actors and an original plot to your party, fundraiser, or corporate event in Dallas–Fort Worth. Escape mysteries are a live show style — guests unlock, search, and race the clock as well as question suspects.",
    href: "/shows",
    cta: "See live shows",
    tone: "live",
  },
  {
    eyebrow: `Hire us · ${BROADCAST_FACTS.season}`,
    title: BROADCAST_FACTS.name,
    text: `${BROADCAST_FACTS.summary} You book us; we host it. Coming ${BROADCAST_FACTS.season}.`,
    href: "/broadcast",
    cta: `Learn about ${BROADCAST_FACTS.name}`,
    tone: "escape",
  },
  {
    eyebrow: "Play tonight",
    title: "Play at home",
    text: "Buy a case, watch the show, weigh the clues, and make your guess. No venue and no booking call — open a case and start investigating.",
    href: "/mysteries",
    cta: "Browse cases",
    tone: "online",
  },
];

const steps = [
  {
    number: "1",
    title: "Choose the evening",
    text: "Pick a live or escape show for your venue, or enquire about The Broadcast for a large online group.",
  },
  {
    number: "2",
    title: "Tell us the date",
    text: "Share your date, guest count, and where the event happens. We reply with availability and a custom quote.",
  },
  {
    number: "3",
    title: "Guests become detectives",
    text: "They gather clues, make accusations, and name the culprit together.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="hero hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">About Mysteries in Motion</p>
          <h1>Theatre professionals bringing mysteries to your event.</h1>
          <p className="hero-lead">
            Founded in Dallas and Fort Worth, we are the company you hire for
            an interactive mystery — live at your venue, or online for a large
            group. You can also play a case at home tonight.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Two doors</p>
          <h2>Hire us, or play at home.</h2>
          <p>
            Same craft, two relationships. Most hosts start with a live show
            for their guests. Escape mysteries are a style of live show, not a
            separate business.
          </p>
        </div>
        <div className="about-live-band">
          <SiteImage spec={SITE_IMAGE_SLOTS.aboutCast} />
          <p>
            We bring professional actors to your venue across the Dallas–Fort
            Worth area. Different shows and rates are available depending on
            what fits your event — ask us for a custom quote.
          </p>
        </div>
        <div className="mystery-types">
          {offerings.map((type) => (
            <article
              className={`mystery-type mystery-type-${type.tone}`}
              key={type.title}
            >
              <p className="eyebrow">{type.eyebrow}</p>
              <h3>{type.title}</h3>
              <p>{type.text}</p>
              <Link className="text-link" href={type.href}>
                {type.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Our story</p>
          <h2>Theatre that needs an audience to finish it.</h2>
        </div>
        <p>
          We believe everyone deserves the thrill of solving a mystery —
          whether that is with a room full of guests and a cast in the middle
          of it, or from the couch in an hour.
        </p>
        <ul>
          <li>Professional actors who bring characters to life</li>
          <li>Engaging, original mystery plots</li>
          <li>Interactive experiences that involve every guest</li>
          <li>
            Live shows we bring to you, {BROADCAST_FACTS.name} for large online
            groups, and cases you can start tonight
          </li>
        </ul>
      </section>

      <section className="section how-preview">
        <div className="section-heading">
          <p className="eyebrow">How hosting works</p>
          <h2>Three steps to your evening.</h2>
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

      <section className="section">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Perfect for any occasion</p>
            <h2>Corporate, celebration, or fundraiser.</h2>
          </div>
          <p>
            Whether you are planning a team-building day, a birthday, or a
            special celebration, a mystery brings people together through the
            excitement of solving a crime.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/book">
            Book an event
          </Link>
          <Link className="button button-ghost" href="/shows">
            Browse live shows
          </Link>
        </div>
        <p className="bridge-note">
          Prefer something tonight from home?{" "}
          <Link className="text-link" href="/mysteries">
            Play a mystery at home
          </Link>
        </p>
      </section>
    </>
  );
}
