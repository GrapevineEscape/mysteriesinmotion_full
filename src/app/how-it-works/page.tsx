import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
};

const stages = [
  [
    "Purchase a case",
    "Start within one year. Your first stream opens 48 hours for complete games and replays.",
  ],
  ["Watch the investigation", "Follow the performance and keep track of every suspicious detail."],
  ["Submit your accusation", "Name the culprit and answer the case-specific supporting questions."],
  ["Watch the reveal", "Your answers lock before the conclusion becomes available."],
  ["Receive your rank", "The case scores your answers and awards your detective classification."],
];

export default function HowItWorksPage() {
  return (
    <section className="page-shell narrow-shell">
      <p className="eyebrow">No rulebook required</p>
      <h1>From opening scene to final verdict.</h1>
      <p className="page-intro">
        Everything happens inside the experience. You can play alone, with a
        partner, or with everyone gathered around the screen.
      </p>
      <ol className="timeline">
        {stages.map(([title, text], index) => (
          <li key={title}>
            <span>{index + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

