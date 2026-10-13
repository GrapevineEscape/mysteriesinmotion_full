import Link from "next/link";
import { HostTestimonials } from "@/components/host-testimonials";
import { WhichOffer } from "@/components/which-offer";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";
import { LIVE_EVENT_FACTS } from "@/lib/live-event-facts";

const ROOMS_URL = "https://www.grapevineescape.com/";
const EXCURSIONS_URL = "https://www.grapevineescape.com/excursions";

const offers = [
  {
    kind: "live",
    eyebrow: "We come to you",
    title: "Private shows",
    text: `A live cast performs at your party, fundraiser, or company event in ${LIVE_EVENT_FACTS.geography}. ${LIVE_EVENT_FACTS.runtime}, ${LIVE_EVENT_FACTS.guestRange.toLowerCase()}.`,
    points: ["You reserve a date", "We bring the cast"],
    href: "/shows",
    cta: "See private shows",
  },
  {
    kind: "broadcast",
    eyebrow: "We host it online",
    title: BROADCAST_FACTS.name,
    text: `${BROADCAST_FACTS.summary} Coming ${BROADCAST_FACTS.season}.`,
    points: ["You hire us", "We host the event"],
    href: "/broadcast",
    cta: `Learn about ${BROADCAST_FACTS.name}`,
  },
  {
    kind: "play",
    eyebrow: "You play tonight",
    title: "Play now",
    text: "Watch an original case, lock in your accusation, and earn your detective rank. No venue, and no booking.",
    points: ["Start when you are ready", "From home"],
    href: "/mysteries",
    cta: "Browse the cases",
  },
] as const;

export default function MarketingHome() {
  return (
    <>
      <section className="hero hero-statement">
        <div className="hero-copy">
          <p className="eyebrow">Dallas–Fort Worth</p>
          <h1>Mysteries in Motion is an interactive mystery company.</h1>
          <p className="hero-lead">
            Hire us to perform at your event, hire us to host your group
            online, or play a case yourself tonight.
          </p>
          <Link className="text-link" href="#which-one">
            Not sure which one?
          </Link>
        </div>
      </section>

      <section className="section offer-section" aria-labelledby="ways-heading">
        <div className="section-heading">
          <p className="eyebrow">Three ways in</p>
          <h2 id="ways-heading">Choose what you want to do.</h2>
        </div>
        <div className="offer-grid">
          {offers.map((offer) => (
            <article className={`offer-card offer-card-${offer.kind}`} key={offer.kind}>
              <p className="eyebrow">{offer.eyebrow}</p>
              <h3>{offer.title}</h3>
              <p>{offer.text}</p>
              <ul>
                {offer.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link className="button button-primary" href={offer.href}>
                {offer.cta}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section sister-section" aria-labelledby="sister-heading">
        <div className="section-heading">
          <p className="eyebrow">Also in Dallas–Fort Worth</p>
          <h2 id="sister-heading">
            Something today, or a game we bring to the party.
          </h2>
          <p>
            The Grapevine Escape is our sister venue. The rooms are for a visit
            today. Escape Excursions are for a party or company event you are
            planning.
          </p>
        </div>
        <div className="sister-grid">
          <a className="sister-card" href={ROOMS_URL} target="_blank" rel="noreferrer">
            <p className="eyebrow">Today</p>
            <h3>The Grapevine Escape</h3>
            <p>
              Escape rooms on Main Street in Grapevine. Book a room and come
              play.
            </p>
            <span className="text-link">
              See the rooms
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
          <a
            className="sister-card"
            href={EXCURSIONS_URL}
            target="_blank"
            rel="noreferrer"
          >
            <p className="eyebrow">A party or company event</p>
            <h3>Escape Excursions</h3>
            <p>
              We bring a hands-on escape to you. About 30 to 45 minutes, with
              teams scored at the end.
            </p>
            <span className="text-link">
              See the excursions
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
        </div>
      </section>

      <WhichOffer />
      <HostTestimonials />
    </>
  );
}
