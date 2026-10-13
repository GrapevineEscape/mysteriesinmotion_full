"use client";

import Link from "next/link";
import { useState } from "react";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";
import { LIVE_EVENT_FACTS } from "@/lib/live-event-facts";

const ROOMS_URL = "https://www.grapevineescape.com/";
const EXCURSIONS_URL = "https://www.grapevineescape.com/excursions";

type Stage = "intent" | "where" | "room" | "online" | "done";
type ResultId = "play" | "rooms" | "private" | "excursions" | "broadcast";

const QUESTIONS: Record<Exclude<Stage, "done">, { prompt: string; number: number }> = {
  intent: { number: 1, prompt: "What are you looking to do?" },
  where: { number: 2, prompt: "Where should it happen?" },
  room: { number: 3, prompt: "What kind of evening do you want?" },
  online: { number: 3, prompt: "Who should run it?" },
};

export function WhichOffer() {
  const [stack, setStack] = useState<Stage[]>(["intent"]);
  const [result, setResult] = useState<ResultId | null>(null);
  const stage = stack[stack.length - 1] ?? "intent";

  function push(next: Stage) {
    setStack((current) => [...current, next]);
  }

  function finish(id: ResultId) {
    setResult(id);
    push("done");
  }

  function back() {
    setResult(null);
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function restart() {
    setResult(null);
    setStack(["intent"]);
  }

  const question = stage === "done" ? null : QUESTIONS[stage];

  return (
    <section className="section finder-section" id="which-one" aria-labelledby="which-heading">
      <div className="section-heading">
        <p className="eyebrow">Not sure which one?</p>
        <h2 id="which-heading">Tell us what you are planning.</h2>
      </div>
      <div className="finder-card">
        {question && (
          <div>
            <p className="finder-step">Question {question.number}</p>
            <h3>{question.prompt}</h3>
            <div className="finder-options" role="group" aria-label={question.prompt}>
              {stage === "intent" && (
                <>
                  <OptionButton onClick={() => finish("play")}>
                    Play a mystery myself
                  </OptionButton>
                  <OptionButton onClick={() => push("where")}>
                    Host something for a group
                  </OptionButton>
                  <OptionButton onClick={() => finish("rooms")}>
                    Find something to do today in Dallas–Fort Worth
                  </OptionButton>
                </>
              )}
              {stage === "where" && (
                <>
                  <OptionButton onClick={() => push("room")}>
                    In a room, with our guests
                  </OptionButton>
                  <OptionButton onClick={() => push("online")}>
                    Online, from wherever people are
                  </OptionButton>
                </>
              )}
              {stage === "room" && (
                <>
                  <OptionButton onClick={() => finish("private")}>
                    A cast performs a mystery for us
                  </OptionButton>
                  <OptionButton onClick={() => finish("excursions")}>
                    Our group solves a hands-on escape
                  </OptionButton>
                </>
              )}
              {stage === "online" && (
                <>
                  <OptionButton onClick={() => finish("broadcast")}>
                    Mysteries in Motion hosts it for our group
                  </OptionButton>
                  <OptionButton onClick={() => finish("play")}>
                    We will play a case ourselves
                  </OptionButton>
                </>
              )}
            </div>
            {stack.length > 1 && (
              <button type="button" className="finder-back" onClick={back}>
                Back
              </button>
            )}
          </div>
        )}

        {stage === "done" && result && (
          <div aria-live="polite">
            <Result id={result} />
            <div className="finder-actions">
              <button type="button" className="finder-back" onClick={back}>
                Back
              </button>
              <button type="button" className="finder-back" onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OptionButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="finder-option" onClick={onClick}>
      {children}
    </button>
  );
}

function Result({ id }: { id: ResultId }) {
  if (id === "play") {
    return (
      <>
        <p className="eyebrow">Play now</p>
        <h3>Start a case yourself.</h3>
        <p>
          Watch an original mystery, lock in your accusation, and earn your
          detective rank. No venue, and no booking. A small group can play the
          same case together.
        </p>
        <Link className="button button-primary finder-result-button" href="/mysteries">
          Browse the cases
        </Link>
      </>
    );
  }

  if (id === "rooms") {
    return (
      <>
        <p className="eyebrow">Today in Grapevine</p>
        <h3>Book an escape room.</h3>
        <p>
          The Grapevine Escape is our room on Main Street in Grapevine. Come
          in, team up, and play today.
        </p>
        <a
          className="button button-primary finder-result-button"
          href={ROOMS_URL}
          target="_blank"
          rel="noreferrer"
        >
          See the rooms
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </>
    );
  }

  if (id === "private") {
    return (
      <>
        <p className="eyebrow">Private shows</p>
        <h3>We bring the cast to you.</h3>
        <p>
          A performed mystery at your venue in {LIVE_EVENT_FACTS.geography}.{" "}
          {LIVE_EVENT_FACTS.runtime}, {LIVE_EVENT_FACTS.guestRange.toLowerCase()}.{" "}
          {LIVE_EVENT_FACTS.leadTime}. For something this week, an escape room
          or an excursion is the nearer option.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/shows">
            See private shows
          </Link>
          <Link className="text-link" href="/book">
            Request a booking
          </Link>
        </div>
      </>
    );
  }

  if (id === "excursions") {
    return (
      <>
        <p className="eyebrow">Escape Excursions</p>
        <h3>We bring a hands-on escape to your event.</h3>
        <p>
          Your guests split into teams and solve a portable escape, about 30 to
          45 minutes, then we score the teams. A good fit for a party or a
          company gathering that wants a game, rather than a performed mystery.
        </p>
        <a
          className="button button-primary finder-result-button"
          href={EXCURSIONS_URL}
          target="_blank"
          rel="noreferrer"
        >
          See Escape Excursions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">{BROADCAST_FACTS.name}</p>
      <h3>We host it online for your group.</h3>
      <p>
        {BROADCAST_FACTS.summary} Coming {BROADCAST_FACTS.season}. If the group
        wants to play before then, start a case yourselves.
      </p>
      <div className="button-row">
        <Link className="button button-primary" href="/broadcast">
          Learn about {BROADCAST_FACTS.name}
        </Link>
        <Link className="text-link" href="/book?format=broadcast">
          Enquire for {BROADCAST_FACTS.season}
        </Link>
      </div>
    </>
  );
}
