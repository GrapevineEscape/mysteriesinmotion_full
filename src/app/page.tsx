import Link from "next/link";
import { mysteries } from "@/lib/mysteries";

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

export default function Home() {
  return (
    <>
      <section className="hero">
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
            <Link className="button button-primary" href="/mysteries">
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
              <strong>Three mysteries</strong>
              <span>More cases ahead</span>
            </li>
            <li>
              <strong>Your verdict</strong>
              <span>Your detective rank</span>
            </li>
          </ul>
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
      </section>

      <section className="section first-cases">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Coming to the case board</p>
            <h2>Three mysteries await.</h2>
          </div>
          <p>
            The case names and premises are confirmed. Artwork, suspects, and
            solutions will be added as each investigation is prepared.
          </p>
        </div>
        <div className="case-grid">
          {mysteries.map((mystery) => (
            <article className="mystery-card placeholder-card" key={mystery.slug}>
              <div className="mystery-art">
                <span>Case {mystery.caseNumber}</span>
                <strong>Classified</strong>
              </div>
              <div className="mystery-card-copy">
                <p className="card-kicker">Original mystery</p>
                <h3>{mystery.title}</h3>
                <p>{mystery.description}</p>
                <span className="status-pill">Framework ready</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
