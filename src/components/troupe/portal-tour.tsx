"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "mim.performerTour.v1";

type Step = { title: string; body: string; target: string | null };

const STEPS: Step[] = [
  {
    title: "Welcome to Mysteries in Motion",
    body: "Thank you for joining the Mysteries in Motion Players. If this is your first time here, let us walk through the sections so you know where everything is.",
    target: null,
  },
  {
    title: "Dashboard",
    body: "Your home base. See open show dates, pending role offers you need to accept or decline, and a snapshot of your roster interest.",
    target: '[data-tour="dashboard"]',
  },
  {
    title: "Profile",
    body: "Keep your contact details, bio, and headshot current. Casting decisions are made from what is here, so it is worth a minute.",
    target: '[data-tour="profile"]',
  },
  {
    title: "Shows",
    body: "Browse productions and mark roles you would play in the future. This is standing interest in the character; it does not cast you for a specific date.",
    target: '[data-tour="shows"]',
  },
  {
    title: "Show dates",
    body: "Open a date and apply for each role you want, one application per role. Flag any rehearsal or tech conflicts and add questions. You can edit after applying. When you are offered a seat, accept or decline it here.",
    target: '[data-tour="show-dates"]',
  },
  {
    title: "Calendar",
    body: "See upcoming performances and rehearsals together. Select an event for the details and a link into casting when it is open.",
    target: '[data-tour="calendar"]',
  },
  {
    title: "You are ready",
    body: "Remember the difference: Shows is for roles you want someday, Show dates is your availability for a booked performance. You can replay this walkthrough anytime from the dashboard.",
    target: null,
  },
];

type Highlight = { top: number; left: number; width: number; height: number };

function readCompleted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing modes can refuse storage; the tour still works, it just
    // will not remember that it has been seen.
    return false;
  }
}

function markCompleted() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

/**
 * First-run walkthrough of the portal. Auto-starts once on the dashboard, and
 * can be replayed from the "take the walkthrough" link.
 */
export function PortalTour({ autoStart = false }: { autoStart?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  const open = useCallback(() => setIndex(0), []);

  const close = useCallback(() => {
    setIndex(null);
    setHighlight(null);
    markCompleted();
  }, []);

  // Deliberately deferred: the sidebar the first steps point at has to be laid
  // out before the highlight can be measured against it, and an overlay that
  // appears the instant the page does reads as an error rather than a welcome.
  useEffect(() => {
    if (!autoStart || readCompleted()) return;
    const timer = window.setTimeout(open, 350);
    return () => window.clearTimeout(timer);
  }, [autoStart, open]);

  useEffect(() => {
    const onReplay = () => open();
    window.addEventListener("mim:start-tour", onReplay);
    return () => window.removeEventListener("mim:start-tour", onReplay);
  }, [open]);

  const step = index === null ? null : STEPS[index];

  // Measured after paint so the cut-out lines up with the element as rendered.
  useLayoutEffect(() => {
    if (!step) return;

    const measure = () => {
      const target = step.target
        ? document.querySelector(step.target)
        : null;
      if (!target) {
        setHighlight(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const padding = 6;
      setHighlight({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  useEffect(() => {
    if (index === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") setIndex((i) => Math.min((i ?? 0) + 1, STEPS.length - 1));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max((i ?? 0) - 1, 0));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, close]);

  if (index === null || !step) return null;

  const isLast = index === STEPS.length - 1;

  return (
    <div className="tour-root">
      <button
        aria-label="Close walkthrough"
        className="tour-backdrop"
        onClick={close}
        type="button"
      />
      {highlight && (
        <div
          aria-hidden="true"
          className="tour-highlight"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
      <div
        aria-labelledby="tour-title"
        aria-modal="true"
        className="tour-card"
        role="dialog"
      >
        <div className="tour-card-header">
          <h2 id="tour-title">{step.title}</h2>
          <button aria-label="Close walkthrough" onClick={close} type="button">
            ×
          </button>
        </div>
        <p>{step.body}</p>
        <div className="tour-card-footer">
          <span className="tour-step">
            {index + 1} / {STEPS.length}
          </span>
          <div className="button-row">
            {index > 0 && (
              <button
                className="button button-small button-ghost"
                onClick={() => setIndex(index - 1)}
                type="button"
              >
                Back
              </button>
            )}
            <button
              className="button button-small button-primary"
              onClick={() => (isLast ? close() : setIndex(index + 1))}
              type="button"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Replays the walkthrough from anywhere inside the portal. */
export function StartTourLink({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="text-link"
      onClick={() => window.dispatchEvent(new Event("mim:start-tour"))}
      type="button"
    >
      {children}
    </button>
  );
}
