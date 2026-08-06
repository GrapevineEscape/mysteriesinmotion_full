import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Mysteries in Motion brings live interactive murder mysteries to venues across the Dallas and Fort Worth area.",
};

const steps = [
  {
    number: "1",
    title: "Choose your mystery",
    text: "Browse our shows and pick the one that best fits your event and your guests.",
  },
  {
    number: "2",
    title: "Book your event",
    text: "Pick your date and venue, and we handle the details that bring the mystery to life.",
  },
  {
    number: "3",
    title: "Solve the mystery",
    text: "Watch your guests become detectives, gathering clues and naming the culprit together.",
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
          <h1>Bringing interactive mysteries to life.</h1>
          <p className="hero-lead">
            Founded by a group of passionate theatre professionals in Dallas and
            Fort Worth, we bring the excitement of live theatre and the intrigue
            of a good mystery directly to you.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Our story</p>
          <h2>Theatre that needs an audience to finish it.</h2>
        </div>
        <p>
          We believe everyone deserves to experience the thrill of solving a
          mystery while enjoying a professional theatrical performance. Our
          approach combines traditional theatre with interactive elements,
          creating an evening your guests help write.
        </p>
        <ul>
          <li>Professional actors who bring characters to life</li>
          <li>Engaging, original mystery plots</li>
          <li>Interactive experiences that involve every guest</li>
          <li>Flexible venues, because we come to you</li>
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
            special celebration, a mystery show brings people together through
            the excitement of solving a crime.
          </p>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/book">
            Book a show
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
