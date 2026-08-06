import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Mysteries in Motion offers online mysteries you can play now, live murder mysteries for your event, and escape mysteries that blend escape-room play into the show.",
};

const mysteryTypes = [
  {
    eyebrow: "Play tonight",
    title: "Online Mysteries",
    text: "Something you can do now. In about an hour you watch the show, weigh the clues, and make your guess. No venue to book, no cast to schedule — just open a case and start investigating.",
    href: "/mysteries",
    cta: "Browse online mysteries",
    tone: "online",
  },
  {
    eyebrow: "Hire the troupe",
    title: "Live Mysteries",
    text: "Your classic murder mystery evening: hire us to come perform for your guests. We bring professional actors, original plots, and an interactive experience to your venue. Different shows and rates are available depending on what fits your event.",
    href: "/shows",
    cta: "See live shows",
    tone: "live",
  },
  {
    eyebrow: "Our most popular",
    title: "Escape Mysteries",
    text: "A new and rare kind of entertainment. We blend escape-room elements into the murder mystery, so guests are not only watching and questioning — they are unlocking, searching, and racing the clock. If you want a hit that people have not seen before, this is it.",
    href: "/shows",
    cta: "Explore escape mysteries",
    tone: "escape",
  },
];

const steps = [
  {
    number: "1",
    title: "Choose your mystery",
    text: "Pick an online case for tonight, or a live or escape show for your next event.",
  },
  {
    number: "2",
    title: "Book — or press play",
    text: "Online mysteries start when you are ready. For live and escape shows, tell us your date and venue and we handle the rest.",
  },
  {
    number: "3",
    title: "Solve the mystery",
    text: "Watch guests become detectives — gathering clues, making accusations, and naming the culprit together.",
  },
];

const team = [
  {
    title: "Creative direction",
    text: "Our creative team develops original plots and characters that keep audiences guessing until the very end.",
  },
  {
    title: "Professional actors",
    text: "A talented pool of local actors brings every character to life with skill and dedication.",
  },
  {
    title: "Event management",
    text: "Our experienced team makes sure each show runs smoothly from setup to final bow.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">About Mysteries in Motion</p>
          <h1>Mysteries you can play tonight — or hire us to bring.</h1>
          <p className="hero-lead">
            Founded by theatre professionals in Dallas and Fort Worth, we build
            interactive mysteries for the screen and for the room: online cases,
            live performances, and escape mysteries that mix the two.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">What we offer</p>
          <h2>Three kinds of mystery.</h2>
          <p>
            Same brand, three ways to play. Pick the experience that fits your
            night — or your event.
          </p>
        </div>
        <div className="mystery-types">
          {mysteryTypes.map((type) => (
            <article className={`mystery-type mystery-type-${type.tone}`} key={type.title}>
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
          We believe everyone deserves the thrill of solving a mystery — whether
          that is from the couch in an hour, or with a room full of guests and a
          cast in the middle of it. Traditional theatre, interactive play, and
          escape-room energy all belong here.
        </p>
        <ul>
          <li>Professional actors who bring characters to life</li>
          <li>Engaging, original mystery plots</li>
          <li>Interactive experiences that involve every guest</li>
          <li>Online cases you can start tonight, and live shows we bring to you</li>
        </ul>
      </section>

      <section className="section how-preview">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
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
            Book a live show
          </Link>
          <Link className="button button-ghost" href="/mysteries">
            Play online
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Our team</p>
          <h2>The creative minds behind the mysteries.</h2>
        </div>
        <div className="steps">
          {team.map((member) => (
            <article className="step-card" key={member.title}>
              <h3>{member.title}</h3>
              <p>{member.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
