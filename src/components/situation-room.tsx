"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectiveRankForScore,
  effectiveSituationRanks,
  type SituationRank,
  type SituationReviewQuestion,
} from "@/lib/situation-room-types";

const demoQuestions: SituationReviewQuestion[] = [
  {
    id: "demo-1",
    question: "Who framed Max?",
    solution: "Debra",
    userAnswer: "Marlo",
    correct: false,
    imageUrl: null,
    explanation: null,
  },
  {
    id: "demo-2",
    question: "Where was the missing ledger hidden?",
    solution: "The office safe",
    userAnswer: "The office safe",
    correct: true,
    imageUrl: null,
    explanation: null,
  },
  {
    id: "demo-3",
    question: "Which key opened the upstairs suite?",
    solution: "The brass key marked 204",
    userAnswer: "The silver key marked 302",
    correct: false,
    imageUrl: null,
    explanation: null,
  },
  {
    id: "demo-4",
    question: "What was the culprit trying to protect?",
    solution: "A family secret",
    userAnswer: "The stolen money",
    correct: false,
    imageUrl: null,
    explanation: null,
  },
  {
    id: "demo-5",
    question: "Who wrote the note about meeting after the toast?",
    solution: "Jordan",
    userAnswer: "Alex",
    correct: false,
    imageUrl: null,
    explanation: null,
  },
  {
    id: "demo-6",
    question: "What time appeared on the altered receipt?",
    solution: "8:42 p.m.",
    userAnswer: "8:42 p.m.",
    correct: true,
    imageUrl: null,
    explanation: null,
  },
];

type FinaleStage = "review" | "vault" | "ranking";

export function SituationRoom({
  detectiveGaugeEnabled = true,
  earnedRank,
  musicEnabledInitially = true,
  musicUrl,
  onComplete,
  questions = demoQuestions,
  ranks = [],
  returnHref = "/my-cases",
  scorePercent,
  title = "So, how did you do?",
  vaultTransitionEnabled = true,
}: {
  detectiveGaugeEnabled?: boolean;
  earnedRank?: string;
  musicEnabledInitially?: boolean;
  musicUrl?: string | null;
  onComplete?: () => void;
  questions?: SituationReviewQuestion[];
  ranks?: SituationRank[];
  returnHref?: string;
  scorePercent?: number;
  title?: string;
  vaultTransitionEnabled?: boolean;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealPhase, setRevealPhase] = useState(0);
  const [finaleStage, setFinaleStage] = useState<FinaleStage>("review");
  const [musicEnabled, setMusicEnabled] = useState(
    musicEnabledInitially && Boolean(musicUrl),
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const completedRef = useRef(false);
  const safeRanks = effectiveSituationRanks(ranks);
  const reviewedCount =
    questionIndex + (revealPhase >= 3 && finaleStage === "review" ? 1 : 0);
  const correctCount = useMemo(
    () =>
      questions
        .slice(0, reviewedCount)
        .filter((question) => question.correct).length,
    [questions, reviewedCount],
  );
  const currentQuestion = questions[questionIndex];
  const finalCorrect = questions.filter((question) => question.correct).length;
  const calculatedPercent =
    questions.length > 0 ? (finalCorrect / questions.length) * 100 : 0;
  const finalPercent = Math.max(
    0,
    Math.min(100, scorePercent ?? calculatedPercent),
  );
  const rank =
    ranks.length > 0 && earnedRank
      ? earnedRank
      : detectiveRankForScore(safeRanks, finalPercent);

  useEffect(() => {
    if (finaleStage !== "review" || revealPhase >= 3 || !currentQuestion) return;
    const timeout = window.setTimeout(
      () => setRevealPhase((phase) => phase + 1),
      720,
    );
    return () => window.clearTimeout(timeout);
  }, [currentQuestion, finaleStage, questionIndex, revealPhase]);

  useEffect(() => {
    if (finaleStage !== "vault") return;
    const timeout = window.setTimeout(() => setFinaleStage("ranking"), 1750);
    return () => window.clearTimeout(timeout);
  }, [finaleStage]);

  useEffect(() => {
    if (!musicUrl || !audioRef.current) return;
    if (musicEnabled) void audioRef.current.play().catch(() => setMusicEnabled(false));
    else audioRef.current.pause();
  }, [musicEnabled, musicUrl]);

  useEffect(() => {
    if (finaleStage !== "ranking" || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [finaleStage, onComplete]);

  function continueReview() {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setRevealPhase(0);
      return;
    }
    setFinaleStage(vaultTransitionEnabled ? "vault" : "ranking");
  }

  function stopMusic() {
    audioRef.current?.pause();
  }

  const persistentAudio = musicUrl ? (
    <audio loop ref={audioRef} src={musicUrl} />
  ) : null;

  function renderContent() {
    if (!currentQuestion && finaleStage === "review") {
      return (
        <section className="submission-confirmation">
          <p className="eyebrow">The Situation Room</p>
          <h1>No questions were configured.</h1>
          <Link
            className="button button-primary"
            href={returnHref}
            onClick={stopMusic}
          >
            Return to Main Game Menu
          </Link>
        </section>
      );
    }

    if (finaleStage === "vault") {
      return (
        <section className="vault-transition" aria-label="Calculating detective rank">
          <div className="vault-door vault-door-left"><span /></div>
          <div className="vault-door vault-door-right"><span /></div>
          <p>Calculating your detective rank…</p>
        </section>
      );
    }

    if (finaleStage === "ranking") {
      return (
        <section className="detective-ranking">
        <div className="rank-intro">
          <p className="eyebrow">Investigation complete</p>
          <h1>Your detective ranking</h1>
          <p>You solved {finalCorrect} of {questions.length} questions.</p>
        </div>

        {detectiveGaugeEnabled && (
          <div className="rank-gauge" aria-label={`Your rank is ${rank}`}>
            <div className="gauge-track">
              <div className="gauge-fill" style={{ height: `${finalPercent}%` }} />
              <div
                className="gauge-indicator"
                style={{ bottom: `calc(${finalPercent}% - 13px)` }}
              >
                <span>{rank}</span>
              </div>
            </div>
            <div className="gauge-labels">
              {safeRanks.toReversed().map(({ name, minimumPercent }) => (
                <div
                  className={name === rank ? "active" : ""}
                  key={name}
                  style={{
                    bottom: `calc(${Math.min(100, Math.max(0, minimumPercent))}% - 15px)`,
                  }}
                >
                  <span>{minimumPercent}%</span>
                  <strong>{name}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="final-rank-card">
          <p>You earned the rank of</p>
          <h2>{rank}</h2>
          <Link
            className="button button-primary"
            href={returnHref}
            onClick={stopMusic}
          >
            Return to Main Game Menu
          </Link>
        </div>
        </section>
      );
    }

    return (
      <section className="situation-room">
        <header className="situation-header">
        <div>
          <p className="eyebrow">The Situation Room</p>
          <h1>{title}</h1>
        </div>
        <div className="situation-actions">
          {musicUrl && (
            <button
              aria-pressed={musicEnabled}
              onClick={() => setMusicEnabled((enabled) => !enabled)}
              type="button"
            >
              {musicEnabled ? "♫ Music on" : "Music off"}
            </button>
          )}
          <div className="live-tally" aria-live="polite">
            <strong>{correctCount}</strong>
            <span>out of {questions.length} correct</span>
          </div>
        </div>
      </header>

      <article className="answer-review" key={currentQuestion.id}>
        <div className="review-progress">
          Question {questionIndex + 1} of {questions.length}
        </div>
        {currentQuestion.imageUrl && (
          <div className="review-image real-review-image">
            <img alt="" src={currentQuestion.imageUrl} />
          </div>
        )}
        <div className="review-lines">
          <div className="review-question">
            <span>Question</span>
            <h2>{currentQuestion.question}</h2>
          </div>
          {revealPhase >= 1 && (
            <div className="review-line solution-line">
              <span>Solution</span>
              <strong>{currentQuestion.solution}</strong>
            </div>
          )}
          {revealPhase >= 2 && (
            <div className="review-line answer-line">
              <span>Your answer</span>
              <strong>{currentQuestion.userAnswer}</strong>
            </div>
          )}
          {revealPhase >= 3 && (
            <>
              <div
                className={`review-result ${currentQuestion.correct ? "correct" : "incorrect"}`}
              >
                <span>Result</span>
                <strong aria-label={currentQuestion.correct ? "Correct" : "Incorrect"}>
                  {currentQuestion.correct ? "✓" : "×"}
                </strong>
              </div>
              {!currentQuestion.correct &&
                currentQuestion.gradingReason && (
                  <div className="review-grading-reason">
                    <span>Why this was marked incorrect</span>
                    <p>{currentQuestion.gradingReason}</p>
                    {currentQuestion.gradingMethod && (
                      <small>
                        {currentQuestion.gradingMethod === "AI_ASSISTED"
                          ? "AI-assisted grading"
                          : currentQuestion.gradingMethod.endsWith("_FALLBACK")
                            ? "Accepted-answer fallback"
                            : "Accepted-answer grading"}
                      </small>
                    )}
                  </div>
                )}
              {currentQuestion.explanation && (
                <p className="review-explanation">
                  {currentQuestion.explanation}
                </p>
              )}
            </>
          )}
        </div>

        {revealPhase >= 3 && (
          <button
            className="button button-primary review-next"
            onClick={continueReview}
            type="button"
          >
            {questionIndex === questions.length - 1
              ? "Reveal my detective rank"
              : "Next question"}
          </button>
        )}
        </article>
      </section>
    );
  }

  return (
    <>
      {persistentAudio}
      {renderContent()}
    </>
  );
}
