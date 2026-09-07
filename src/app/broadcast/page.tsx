import type { Metadata } from "next";
import Link from "next/link";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";

export const metadata: Metadata = {
  title: BROADCAST_FACTS.name,
  description: `${BROADCAST_FACTS.summary} Coming ${BROADCAST_FACTS.season}.`,
};

const points = [
  {
    title: "We run it for you",
    text: "This is a hosted event. You hire us for your company, association, or large group — we produce the mystery.",
  },
  {
    title: "From anywhere",
    text: "Guests join online. No DFW venue, no travel, no room to dress. Teams can sit together or log in from wherever they are.",
  },
  {
    title: `Up to ${BROADCAST_FACTS.guestMax} people`,
    text: "Built for groups that are too large — or too spread out — for a living-room case or a typical private-party cast.",
  },
];

export default function BroadcastPage() {
  return (
    <>
      <section className="hero hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">
            Coming {BROADCAST_FACTS.season} · Hire us
          </p>
          <h1>{BROADCAST_FACTS.name}</h1>
          <p className="hero-lead">
            An online mystery event we run for your group. Up to{" "}
            {BROADCAST_FACTS.guestMax} people, from anywhere.
          </p>
          <div className="button-row">
            <Link
              className="button button-primary"
              href="/book?format=broadcast"
            >
              Enquire for {BROADCAST_FACTS.season}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/shows">
              Looking for a live show instead?
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">What it is</p>
          <h2>A company you hire — on a screen.</h2>
          <p>
            {BROADCAST_FACTS.name} is not a case you buy and start tonight. It
            is not a Zoom stand-in for a living-room mystery. It is a
            facilitated event for a large group, coming {BROADCAST_FACTS.season}.
          </p>
        </div>
        <div className="steps">
          {points.map((point) => (
            <article className="step-card" key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Not the Case Room</p>
            <h2>If you want to play tonight, that door is separate.</h2>
          </div>
          <p>
            Families and small groups can still buy a prerecorded mystery and
            play at home. {BROADCAST_FACTS.name} is for hosts who need us in
            the room — even when the room is a livestream.
          </p>
        </div>
        <div className="button-row">
          <Link
            className="button button-primary"
            href="/book?format=broadcast"
          >
            Request {BROADCAST_FACTS.name}
          </Link>
          <Link className="button button-ghost" href="/mysteries">
            Play a mystery at home
          </Link>
        </div>
      </section>
    </>
  );
}
