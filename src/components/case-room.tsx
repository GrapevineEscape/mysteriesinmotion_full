"use client";

import { useEffect, useRef, useState } from "react";
import { SituationRoom } from "@/components/situation-room";

type Stage =
  | "briefing"
  | "act-one"
  | "intermission"
  | "submitted"
  | "countdown"
  | "act-two"
  | "situation-room";

type Evidence = {
  id: string;
  title: string;
  description: string;
  unlockAt: number;
  mark: string;
};

const evidence: Evidence[] = [
  {
    id: "receipt",
    title: "Café Receipt",
    description:
      "A receipt stamped 8:42 p.m. The handwritten table number appears to have been changed.",
    unlockAt: 8,
    mark: "8:42",
  },
  {
    id: "key",
    title: "Brass Room Key",
    description:
      "A worn brass key tagged 204. A faint trace of red thread is caught near its teeth.",
    unlockAt: 22,
    mark: "204",
  },
  {
    id: "note",
    title: "Folded Note",
    description:
      "The note reads: “Not in front of the others. Meet me after the toast.” No name is attached.",
    unlockAt: 39,
    mark: "NOTE",
  },
];

const ACT_ONE_LENGTH = 58;
const ACT_TWO_LENGTH = 46;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CaseRoom({ isAdmin = false }: { isAdmin?: boolean }) {
  const [stage, setStage] = useState<Stage>("briefing");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [furthestTime, setFurthestTime] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [newEvidenceCount, setNewEvidenceCount] = useState(0);
  const [culprit, setCulprit] = useState("");
  const [motive, setMotive] = useState("");
  const [detail, setDetail] = useState("");
  const [countdown, setCountdown] = useState(5);
  const caseRoomRef = useRef<HTMLDivElement>(null);

  const isAct = stage === "act-one" || stage === "act-two";
  const duration = stage === "act-two" ? ACT_TWO_LENGTH : ACT_ONE_LENGTH;
  const unlockedEvidence = evidence.filter(
    (item) => furthestTime >= item.unlockAt,
  );

  useEffect(() => {
    if (!playing || !isAct) return;

    const interval = window.setInterval(() => {
      setCurrentTime((previous) => {
        const next = Math.min(previous + 1, duration);
        if (stage === "act-one") {
          setFurthestTime((furthest) => {
            const updatedFurthest = Math.max(furthest, next);
            const newlyUnlocked = evidence.filter(
              (item) =>
                item.unlockAt > furthest && item.unlockAt <= updatedFurthest,
            );
            if (newlyUnlocked.length) {
              setNewEvidenceCount(
                (count) => count + newlyUnlocked.length,
              );
            }
            return updatedFurthest;
          });
        }
        if (next >= duration) {
          setPlaying(false);
          if (stage === "act-one") {
            setStage("intermission");
            setCurrentTime(0);
            setInventoryOpen(false);
            setSelectedEvidence(null);
          } else if (stage === "act-two") {
            setStage("situation-room");
          }
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [duration, isAct, playing, stage]);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timeout = window.setTimeout(() => {
      if (countdown <= 1) {
        setStage("act-two");
        setCurrentTime(0);
        setPlaying(true);
        return;
      }
      setCountdown((value) => value - 1);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [countdown, stage]);

  function startActOne() {
    setStage("act-one");
    setCurrentTime(0);
    setPlaying(true);
  }

  function toggleInventory() {
    setInventoryOpen((open) => !open);
    setSelectedEvidence(null);
    setNewEvidenceCount(0);
  }

  function rewindThirtySeconds() {
    setCurrentTime((time) => Math.max(0, time - 30));
  }

  function forwardThirtySeconds() {
    setCurrentTime((time) => Math.min(duration - 1, time + 30));
  }

  function enterIntermissionForDemo() {
    setFurthestTime(ACT_ONE_LENGTH);
    setCurrentTime(0);
    setPlaying(false);
    setInventoryOpen(false);
    setSelectedEvidence(null);
    setStage("intermission");
  }

  function submitAccusation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInventoryOpen(false);
    setSelectedEvidence(null);
    setStage("submitted");
  }

  async function continueToReveal() {
    try {
      await caseRoomRef.current?.requestFullscreen();
    } catch {
      // Full-screen permission can be declined; the reveal still continues.
    }
    setCountdown(5);
    setStage("countdown");
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void caseRoomRef.current?.requestFullscreen();
  }

  return (
    <div className={`case-room stage-${stage}`} ref={caseRoomRef}>
      {stage === "briefing" && (
        <section className="case-briefing">
          <p className="eyebrow">Before the investigation begins</p>
          <h1>Watch carefully. Take notes.</h1>
          <p>
            You may pause or review the previous 30 seconds during Act One.
            Forward seeking is disabled. Once Act One ends, you will enter the
            Decision Room and cannot return to the performance.
          </p>
          <div className="briefing-rules">
            <span>Pause anytime</span>
            <span>Review 30 seconds</span>
            <span>No return after Act One</span>
          </div>
          <button
            className="button button-primary"
            onClick={startActOne}
            type="button"
          >
            I understand—begin Act One
          </button>
        </section>
      )}

      {stage === "act-one" && (
        <VideoStage
          actLabel="Act One"
          currentTime={currentTime}
          duration={duration}
          onFullscreen={toggleFullscreen}
          onForward={isAdmin ? forwardThirtySeconds : undefined}
          onPause={() => setPlaying((value) => !value)}
          onRewind={rewindThirtySeconds}
          playing={playing}
          title="The Investigation"
        >
          {isAdmin && (
            <button
              className="prototype-skip"
              onClick={enterIntermissionForDemo}
              type="button"
            >
              Admin: enter Intermission
            </button>
          )}
        </VideoStage>
      )}

      {stage === "intermission" && (
        <section className="decision-room">
          <div className="intermission-pane">
            <div className="intermission-media">
              <div className="projector-light" />
              <p className="eyebrow">Intermission</p>
              <h1>Discuss the evidence.</h1>
              <p>
                Act One is complete. Review your notes and Case Inventory before
                making your final accusation.
              </p>
            </div>
          </div>
          <div className="accusation-pane">
            <p className="eyebrow">Final decision</p>
            <h2>Make your accusation.</h2>
            <form onSubmit={submitAccusation}>
              <fieldset>
                <legend>Who committed the crime?</legend>
                {["Alex Vale", "Jordan Pierce", "Morgan Cross"].map((name) => (
                  <label className="choice-card" key={name}>
                    <input
                      checked={culprit === name}
                      name="culprit"
                      onChange={() => setCulprit(name)}
                      required
                      type="radio"
                      value={name}
                    />
                    <span className="choice-control" aria-hidden="true" />
                    <span>{name}</span>
                  </label>
                ))}
              </fieldset>

              <label className="field-label" htmlFor="motive">
                What was the motive?
              </label>
              <select
                id="motive"
                onChange={(event) => setMotive(event.target.value)}
                required
                value={motive}
              >
                <option value="">Choose a motive</option>
                <option value="money">Money</option>
                <option value="revenge">Revenge</option>
                <option value="protection">Protecting a secret</option>
              </select>

              <label className="field-label" htmlFor="detail">
                Which detail proves your theory?
              </label>
              <textarea
                id="detail"
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Explain the clue that convinced you…"
                required
                rows={4}
                value={detail}
              />

              <p className="submission-warning">
                Your answers cannot be changed after submission.
              </p>
              <button className="button button-primary" type="submit">
                Submit final accusation
              </button>
            </form>
          </div>
        </section>
      )}

      {stage === "submitted" && (
        <section className="submission-confirmation">
          <span className="confirmation-mark" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">Accusation recorded</p>
          <h1>Thank you, Detectives!</h1>
          <p>Get your popcorn ready—the truth is about to be revealed.</p>
          <button
            className="button button-primary reveal-button"
            onClick={continueToReveal}
            type="button"
          >
            Continue to the Reveal
          </button>
        </section>
      )}

      {stage === "countdown" && (
        <section className="reveal-countdown" aria-live="assertive">
          <p>The truth is about to be revealed</p>
          <strong key={countdown}>{countdown || ""}</strong>
        </section>
      )}

      {stage === "act-two" && (
        <VideoStage
          actLabel="Act Two"
          currentTime={currentTime}
          duration={duration}
          onFullscreen={toggleFullscreen}
          onForward={isAdmin ? forwardThirtySeconds : undefined}
          onPause={() => setPlaying((value) => !value)}
          onRewind={rewindThirtySeconds}
          playing={playing}
          title="The Reveal"
        >
          {isAdmin && (
            <button
              className="prototype-skip"
              onClick={() => setStage("situation-room")}
              type="button"
            >
              Admin: view Situation Room
            </button>
          )}
        </VideoStage>
      )}

      {stage === "situation-room" && <SituationRoom />}

      {(stage === "act-one" ||
        stage === "intermission" ||
        stage === "act-two") && (
        <Inventory
          evidence={unlockedEvidence}
          isOpen={inventoryOpen}
          newCount={newEvidenceCount}
          onCloseEvidence={() => setSelectedEvidence(null)}
          onSelectEvidence={setSelectedEvidence}
          onToggle={toggleInventory}
          selectedEvidence={selectedEvidence}
        />
      )}
    </div>
  );
}

type VideoStageProps = {
  actLabel: string;
  children?: React.ReactNode;
  currentTime: number;
  duration: number;
  onFullscreen: () => void;
  onForward?: () => void;
  onPause: () => void;
  onRewind: () => void;
  playing: boolean;
  title: string;
};

function VideoStage({
  actLabel,
  children,
  currentTime,
  duration,
  onFullscreen,
  onForward,
  onPause,
  onRewind,
  playing,
  title,
}: VideoStageProps) {
  return (
    <section className="video-stage">
      <div className="video-placeholder">
        <div className="video-vignette" />
        <p className="video-act-label">{actLabel}</p>
        <h1>{title}</h1>
        <p className="video-placeholder-note">
          Protected show video will fill this screen.
        </p>
        {children}
      </div>
      <div className="video-progress" aria-label="Playback progress">
        <span style={{ width: `${(currentTime / duration) * 100}%` }} />
      </div>
      <div className="video-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      <button
        aria-label="Toggle full screen"
        className="fullscreen-control"
        onClick={onFullscreen}
        type="button"
      >
        ⛶ <span>Full screen</span>
      </button>
      <div className="playback-controls">
        <button onClick={onRewind} type="button">
          <strong>↶</strong>
          <span>Back 30</span>
        </button>
        {onForward && (
          <button onClick={onForward} type="button">
            <strong>↷</strong>
            <span>Forward 30</span>
          </button>
        )}
        <button onClick={onPause} type="button">
          <strong>{playing ? "Ⅱ" : "▶"}</strong>
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
      </div>
    </section>
  );
}

type InventoryProps = {
  evidence: Evidence[];
  isOpen: boolean;
  newCount: number;
  onCloseEvidence: () => void;
  onSelectEvidence: (item: Evidence) => void;
  onToggle: () => void;
  selectedEvidence: Evidence | null;
};

function Inventory({
  evidence,
  isOpen,
  newCount,
  onCloseEvidence,
  onSelectEvidence,
  onToggle,
  selectedEvidence,
}: InventoryProps) {
  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Close" : "Open"} Case Inventory`}
        className={`briefcase-button ${isOpen ? "open" : ""} ${newCount ? "has-new" : ""}`}
        onClick={onToggle}
        type="button"
      >
        <span className="briefcase-icon" aria-hidden="true">
          ▰
        </span>
        <span>Case Inventory</span>
        {newCount > 0 && <strong>{newCount}</strong>}
      </button>

      {isOpen && (
        <aside className="inventory-drawer">
          <div className="inventory-heading">
            <div>
              <p className="eyebrow">Evidence collected</p>
              <h2>Case Inventory</h2>
            </div>
            <button onClick={onToggle} type="button">
              Close
            </button>
          </div>
          {evidence.length ? (
            <div className="evidence-list">
              {evidence.map((item) => (
                <button
                  className="evidence-card"
                  key={item.id}
                  onClick={() => onSelectEvidence(item)}
                  type="button"
                >
                  <span>{item.mark}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="inventory-empty">
              Evidence will appear here as it is discovered.
            </p>
          )}
        </aside>
      )}

      {selectedEvidence && (
        <div
          aria-modal="true"
          className="evidence-modal"
          onClick={onCloseEvidence}
          role="dialog"
        >
          <article onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close evidence"
              className="evidence-close"
              onClick={onCloseEvidence}
              type="button"
            >
              ×
            </button>
            <div className="evidence-enlargement">
              <span>{selectedEvidence.mark}</span>
            </div>
            <p className="eyebrow">Evidence item</p>
            <h2>{selectedEvidence.title}</h2>
            <p>{selectedEvidence.description}</p>
          </article>
        </div>
      )}
    </>
  );
}
