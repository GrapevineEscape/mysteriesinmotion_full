"use client";

/* eslint-disable @next/next/no-img-element */

import Hls from "hls.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SituationRoom } from "@/components/situation-room";
import type {
  DraftAnswers,
  PlayProgress,
  PlayProgressResponse,
  PlayStage,
} from "@/lib/play-progress-types";
import type { IntermissionLink } from "@/lib/intermission-links";
import type { SituationResult } from "@/lib/situation-room-types";

type LiveStage =
  | "briefing"
  | "intro"
  | "act-one"
  | "intermission"
  | "submitted"
  | "countdown"
  | "act-two"
  | "situation-room";

type LiveEvidence = {
  description: string | null;
  fileUrl: string | null;
  iconUrl: string | null;
  id: string;
  title: string;
  unlockAtSeconds: number;
  unlockStage: "ACT_ONE" | "ACT_TWO" | "INTERMISSION";
  visibleDuringIntermission: boolean;
  visibleDuringReveal: boolean;
};

type LiveQuestion = {
  choices: Array<{ id: string; label: string }>;
  id: string;
  prompt: string;
  required: boolean;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT";
};

export type LiveShowConfiguration = {
  attemptId: string;
  actOneTitle: string;
  actOneVideoId: string | null;
  actTwoTitle: string;
  actTwoVideoId: string | null;
  accusationSeconds: number | null;
  accusationTimed: boolean;
  timerExpirationAction: "SUBMIT_CURRENT" | "MARK_UNANSWERED_INCORRECT";
  timerWarningSeconds: number | null;
  evidence: LiveEvidence[];
  intermissionImageUrl: string | null;
  intermissionLinks: IntermissionLink[];
  intermissionMediaType: "NONE" | "VIDEO" | "IMAGE";
  intermissionTitle: string;
  intermissionVideoId: string | null;
  intermissionVideoLoops: boolean;
  introEnabled: boolean;
  introTitle: string | null;
  introVideoId: string | null;
  inventoryEnabled: boolean;
  questions: LiveQuestion[];
  progress: PlayProgress;
  resultsMusicEnabled: boolean;
  resultsMusicUrl: string | null;
  situationResult: SituationResult | null;
  situationRoomTitle: string;
  slug: string;
  title: string;
  vaultTransitionEnabled: boolean;
  detectiveGaugeEnabled: boolean;
};

function restoredStage(stage: PlayStage): LiveStage {
  switch (stage) {
    case "INTRO":
      return "intro";
    case "ACT_ONE":
      return "act-one";
    case "INTERMISSION":
      return "intermission";
    case "ACCUSATION_SUBMITTED":
      return "submitted";
    case "COUNTDOWN":
      return "countdown";
    case "ACT_TWO":
      return "act-two";
    case "SITUATION_ROOM":
    case "COMPLETED":
      return "situation-room";
    default:
      return "briefing";
  }
}

function savedStage(stage: LiveStage): PlayStage {
  const stages: Record<LiveStage, PlayStage> = {
    briefing: "NOT_STARTED",
    intro: "INTRO",
    "act-one": "ACT_ONE",
    intermission: "INTERMISSION",
    submitted: "ACCUSATION_SUBMITTED",
    countdown: "COUNTDOWN",
    "act-two": "ACT_TWO",
    "situation-room": "SITUATION_ROOM",
  };
  return stages[stage];
}

function streamUrl(videoReference: string, loop = false) {
  const parameters = new URLSearchParams({
    autoplay: "true",
    controls: "false",
    preload: "auto",
    primaryColor: "#a82d2d",
  });
  if (loop) parameters.set("loop", "true");

  const trimmedReference = videoReference.trim();
  const embeddedSource =
    trimmedReference.match(/src=["']([^"']+)["']/i)?.[1] ?? trimmedReference;

  if (/^https?:\/\//i.test(embeddedSource)) {
    const url = new URL(embeddedSource);
    url.pathname = url.pathname.replace(/\/watch\/?$/, "/iframe");
    parameters.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  }

  return `https://iframe.videodelivery.net/${encodeURIComponent(embeddedSource)}?${parameters}`;
}

function videoUid(videoReference: string) {
  const trimmedReference = videoReference.trim();
  const embeddedSource =
    trimmedReference.match(/src=["']([^"']+)["']/i)?.[1] ?? trimmedReference;
  if (!/^https?:\/\//i.test(embeddedSource)) return embeddedSource;

  const segments = new URL(embeddedSource).pathname.split("/").filter(Boolean);
  const playerSuffix = segments.findIndex((segment) =>
    ["iframe", "watch", "manifest"].includes(segment),
  );
  return segments[Math.max(0, playerSuffix === -1 ? segments.length - 1 : playerSuffix - 1)] ?? "";
}

function manifestUrl(videoReference: string) {
  return `https://videodelivery.net/${encodeURIComponent(videoUid(videoReference))}/manifest/video.m3u8`;
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) ? totalSeconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function IntermissionPages({ links }: { links: IntermissionLink[] }) {
  const [open, setOpen] = useState<IntermissionLink | null>(null);
  if (!links.length) return null;
  return (
    <>
      <div className="blotter-papers">
        <p className="eyebrow">On the desk</p>
        {links.map((link) => (
          <button
            className="blotter-paper"
            key={`${link.label}-${link.url}`}
            type="button"
            onClick={() => setOpen(link)}
          >
            <strong>{link.label}</strong>
            <span>{link.url}</span>
            {link.note ? <small>{link.note}</small> : null}
          </button>
        ))}
      </div>
      {open && (
        <div className="desk-browser" role="dialog" aria-label={open.label}>
          <div className="desk-browser-chrome">
            <button type="button" onClick={() => setOpen(null)}>
              ← Desk
            </button>
            <div className="desk-browser-address">{open.url}</div>
            <a href={open.url} rel="noreferrer" target="_blank">
              New tab
            </a>
          </div>
          {open.pictureUrl ? (
            <div className="desk-browser-page">
              <img alt={open.label} src={open.pictureUrl} />
            </div>
          ) : (
            <iframe src={open.url} title={open.label} />
          )}
          {!open.pictureUrl && (
            <p>
              If this page stays blank, that site will not appear inside the
              desk. Use New tab. The timer keeps running.
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function LiveCaseRoom({
  isAdmin,
  show,
}: {
  isAdmin: boolean;
  show: LiveShowConfiguration;
}) {
  const [stage, setStage] = useState<LiveStage>(() =>
    restoredStage(show.progress.stage),
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(
    () => new Set(show.progress.unlockedEvidenceIds),
  );
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] =
    useState<LiveEvidence | null>(null);
  const [answers, setAnswers] = useState<DraftAnswers>(
    () => show.progress.draftAnswers,
  );
  const [countdown, setCountdown] = useState(5);
  const [timerExpiresAt, setTimerExpiresAt] = useState<string | null>(
    show.progress.timerExpiresAt,
  );
  const [timerRemaining, setTimerRemaining] = useState<number | null>(() =>
    show.progress.timerExpiresAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(show.progress.timerExpiresAt).getTime() - Date.now()) /
              1_000,
          ),
        )
      : null,
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [videoReloadKey, setVideoReloadKey] = useState(0);
  const [situationResult, setSituationResult] =
    useState<SituationResult | null>(show.situationResult);
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const furthestRef = useRef({
    INTRO: show.progress.furthestIntroSeconds,
    ACT_ONE: show.progress.furthestActOneSeconds,
    ACT_TWO: show.progress.furthestActTwoSeconds,
  });
  const answersRef = useRef<DraftAnswers>(show.progress.draftAnswers);
  const lastSavedSecondsRef = useRef({
    INTRO: show.progress.furthestIntroSeconds,
    ACT_ONE: show.progress.furthestActOneSeconds,
    ACT_TWO: show.progress.furthestActTwoSeconds,
  });
  const autoSubmissionStartedRef = useRef(false);
  const autoSubmitCallbackRef = useRef<() => void>(() => undefined);
  const progressRevisionRef = useRef(show.progress.progressRevision);

  const activeVideoId =
    stage === "intro"
      ? show.introVideoId
      : stage === "act-one"
        ? show.actOneVideoId
        : stage === "act-two"
          ? show.actTwoVideoId
          : null;
  const activeEvidenceStage =
    stage === "act-two" ? "ACT_TWO" : stage === "act-one" ? "ACT_ONE" : null;
  const activeProgressStage =
    stage === "intro"
      ? "INTRO"
      : stage === "act-one"
        ? "ACT_ONE"
        : stage === "act-two"
          ? "ACT_TWO"
          : null;
  const unlockedEvidence = useMemo(
    () =>
      show.evidence.filter((clue) => {
        if (!unlockedIds.has(clue.id)) return false;
        if (stage === "intermission") {
          if (clue.unlockStage === "INTERMISSION") {
            return clue.unlockAtSeconds === 0 || unlockedIds.has(clue.id);
          }
          return (
            clue.unlockStage === "ACT_ONE" && clue.visibleDuringIntermission
          );
        }
        if (stage === "act-two" || stage === "situation-room") {
          return clue.unlockStage === "ACT_TWO" || clue.visibleDuringReveal;
        }
        return clue.unlockStage === "ACT_ONE";
      }),
    [show.evidence, stage, unlockedIds],
  );

  const saveProgress = useCallback(
    async (progress: {
      draftAnswers?: DraftAnswers;
      enterIntermission?: boolean;
      playbackSeconds?: number;
      stage: PlayStage;
      startedPlayback?: boolean;
    }) => {
      progressRevisionRef.current += 1;
      const progressRevision = progressRevisionRef.current;
      try {
        const response = await fetch(
          `/api/play/${encodeURIComponent(show.slug)}/progress`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId: show.attemptId,
              progressRevision,
              ...progress,
            }),
            keepalive: true,
          },
        );
        if (!response.ok) return null;
        const saved = (await response.json()) as PlayProgressResponse;
        progressRevisionRef.current = Math.max(
          progressRevisionRef.current,
          saved.progressRevision,
        );
        setTimerExpiresAt(saved.timerExpiresAt);
        setUnlockedIds(new Set(saved.unlockedEvidenceIds));
        furthestRef.current.INTRO = Math.max(
          furthestRef.current.INTRO,
          saved.furthestIntroSeconds,
        );
        furthestRef.current.ACT_ONE = Math.max(
          furthestRef.current.ACT_ONE,
          saved.furthestActOneSeconds,
        );
        furthestRef.current.ACT_TWO = Math.max(
          furthestRef.current.ACT_TWO,
          saved.furthestActTwoSeconds,
        );
        return saved;
      } catch {
        // Playback continues during a brief network interruption; the next
        // periodic update retries without disrupting the customer.
        return null;
      }
    },
    [show.attemptId, show.slug],
  );

  useEffect(() => {
    const player = videoRef.current;
    if (!player || !activeVideoId) return;

    let hls: Hls | null = null;
    let recoveryAttempts = 0;
    const source = manifestUrl(activeVideoId);
    if (player.canPlayType("application/vnd.apple.mpegurl")) {
      player.src = source;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          recoveryAttempts < 2
        ) {
          recoveryAttempts += 1;
          hls?.startLoad();
          return;
        }
        if (
          data.type === Hls.ErrorTypes.MEDIA_ERROR &&
          recoveryAttempts < 2
        ) {
          recoveryAttempts += 1;
          hls?.recoverMediaError();
          return;
        }
        setPlaying(false);
        setVideoError(
          "The video stream was interrupted. Your place is saved, so it is safe to retry.",
        );
      });
      hls.loadSource(source);
      hls.attachMedia(player);
    }

    const updateTime = () => {
      const time = player.currentTime || 0;
      setCurrentTime(time);
      setDuration(player.duration || 0);
      setPlaying(!player.paused);

      if (!activeProgressStage) return;
      const priorFurthest = furthestRef.current[activeProgressStage];
      if (!isAdmin && time > priorFurthest + 3) {
        player.currentTime = priorFurthest;
        return;
      }
      const nextFurthest = Math.max(priorFurthest, time);
      furthestRef.current[activeProgressStage] = nextFurthest;
      if (activeEvidenceStage) {
        setUnlockedIds((current) => {
          const next = new Set(current);
          show.evidence
            .filter(
              (clue) =>
                clue.unlockStage === activeEvidenceStage &&
                clue.unlockAtSeconds <= nextFurthest,
            )
            .forEach((clue) => next.add(clue.id));
          return next;
        });
      }

      if (
        nextFurthest - lastSavedSecondsRef.current[activeProgressStage] >= 5
      ) {
        lastSavedSecondsRef.current[activeProgressStage] = nextFurthest;
        void saveProgress({
          stage: savedStage(stage),
          playbackSeconds: nextFurthest,
        });
      }
    };
    const ended = () => {
      setPlaying(false);
      setCurrentTime(0);
      if (activeProgressStage) {
        void saveProgress({
          stage: savedStage(stage),
          playbackSeconds: furthestRef.current[activeProgressStage],
        });
      }
      if (stage === "intro") {
        setVideoError(null);
        setStage("act-one");
        void saveProgress({ stage: "ACT_ONE" });
      }
      if (stage === "act-one") {
        setVideoError(null);
        setStage("intermission");
      }
      if (stage === "act-two") {
        setVideoError(null);
        setStage("situation-room");
        void saveProgress({ stage: "SITUATION_ROOM" });
      }
    };
    const play = () => {
      setPlaying(true);
      setAutoplayBlocked(false);
      setVideoError(null);
      if (activeProgressStage) {
        void saveProgress({
          stage: savedStage(stage),
          playbackSeconds: furthestRef.current[activeProgressStage],
          startedPlayback: true,
        });
      }
    };
    const pause = () => {
      setPlaying(false);
      if (activeProgressStage) {
        void saveProgress({
          stage: savedStage(stage),
          playbackSeconds: furthestRef.current[activeProgressStage],
        });
      }
    };
    const playbackFailed = () => {
      setPlaying(false);
      setAutoplayBlocked(false);
      setVideoError(
        "The video stream could not be loaded. Your place is saved, so it is safe to retry.",
      );
    };
    const resumeFromSavedProgress = () => {
      if (!activeProgressStage) return;
      const savedSeconds = furthestRef.current[activeProgressStage];
      if (savedSeconds > 0 && player.currentTime < 0.5) {
        player.currentTime = Math.min(
          savedSeconds,
          Number.isFinite(player.duration)
            ? Math.max(0, player.duration - 0.25)
            : savedSeconds,
        );
      }
    };

    player.addEventListener("timeupdate", updateTime);
    player.addEventListener("durationchange", updateTime);
    player.addEventListener("loadedmetadata", updateTime);
    player.addEventListener("loadedmetadata", resumeFromSavedProgress);
    player.addEventListener("canplay", updateTime);
    player.addEventListener("ended", ended);
    player.addEventListener("play", play);
    player.addEventListener("pause", pause);
    player.addEventListener("error", playbackFailed);
    const attemptAutoplay = () => {
      void player.play().catch(() => {
        setPlaying(false);
        if (stage === "act-two") {
          setAutoplayBlocked(true);
          setVideoError(
            "Act Two is ready. Your browser blocked automatic playback, so tap below to begin.",
          );
        }
      });
    };
    player.addEventListener("canplay", attemptAutoplay, { once: true });
    return () => {
      player.removeEventListener("timeupdate", updateTime);
      player.removeEventListener("durationchange", updateTime);
      player.removeEventListener("loadedmetadata", updateTime);
      player.removeEventListener("loadedmetadata", resumeFromSavedProgress);
      player.removeEventListener("canplay", updateTime);
      player.removeEventListener("ended", ended);
      player.removeEventListener("play", play);
      player.removeEventListener("pause", pause);
      player.removeEventListener("error", playbackFailed);
      player.removeEventListener("canplay", attemptAutoplay);
      player.removeAttribute("src");
      player.load();
      hls?.destroy();
    };
  }, [
    activeEvidenceStage,
    activeProgressStage,
    activeVideoId,
    isAdmin,
    saveProgress,
    show.evidence,
    stage,
    videoReloadKey,
  ]);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timeout = window.setTimeout(() => {
      if (countdown <= 1) {
        setVideoError(null);
        setAutoplayBlocked(false);
        setStage("act-two");
        setCountdown(5);
        void saveProgress({ stage: "ACT_TWO" });
      } else {
        setCountdown((value) => value - 1);
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [countdown, saveProgress, stage]);

  useEffect(() => {
    if (stage !== "intermission") return;
    setUnlockedIds((current) => {
      const next = new Set(current);
      show.evidence
        .filter(
          (clue) =>
            (clue.unlockStage === "INTERMISSION" &&
              clue.unlockAtSeconds === 0) ||
            (clue.unlockStage === "ACT_ONE" && clue.visibleDuringIntermission),
        )
        .forEach((clue) => next.add(clue.id));
      return next;
    });
    void saveProgress({
      stage: "INTERMISSION",
      enterIntermission: true,
      draftAnswers: answersRef.current,
    });
  }, [saveProgress, show.evidence, stage]);

  useEffect(() => {
    if (stage !== "intermission") return;
    const timeout = window.setTimeout(() => {
      void saveProgress({
        stage: "INTERMISSION",
        draftAnswers: answers,
      });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [answers, saveProgress, stage]);

  useEffect(() => {
    autoSubmitCallbackRef.current = () => void recordAccusation();
  });

  useEffect(() => {
    if (stage !== "intermission" || !timerExpiresAt) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(timerExpiresAt).getTime() - Date.now()) / 1_000),
      );
      setTimerRemaining(remaining);
      if (remaining === 0 && !autoSubmissionStartedRef.current) {
        autoSubmissionStartedRef.current = true;
        autoSubmitCallbackRef.current();
      }
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [stage, timerExpiresAt]);

  async function startShow() {
    const nextStage =
      show.introEnabled && show.introVideoId ? "intro" : "act-one";
    setStartError(null);
    setVideoError(null);
    const saved = await saveProgress({ stage: savedStage(nextStage) });
    if (!saved) {
      setStartError(
        "The show could not be started. Refresh to confirm your access and try again.",
      );
      return;
    }
    setStage(nextStage);
  }

  function moveToIntermission() {
    videoRef.current?.pause();
    setVideoError(null);
    setStage("intermission");
    setCurrentTime(0);
    setInventoryOpen(false);
    void saveProgress({
      stage: "INTERMISSION",
      enterIntermission: true,
      draftAnswers: answersRef.current,
    });
  }

  function togglePlayback() {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) void player.play();
    else player.pause();
  }

  function seekBy(seconds: number) {
    const player = videoRef.current;
    if (!player) return;
    player.currentTime = Math.max(
      0,
      Math.min(player.duration || 0, player.currentTime + seconds),
    );
  }

  function retryVideo() {
    setVideoError(null);
    if (autoplayBlocked && videoRef.current) {
      void videoRef.current.play().catch(() => {
        setAutoplayBlocked(false);
        setVideoReloadKey((current) => current + 1);
      });
      return;
    }
    setVideoReloadKey((current) => current + 1);
  }

  function updateAnswer(questionId: string, value: string, multiple = false) {
    setAnswers((current) => {
      if (!multiple) {
        const next = { ...current, [questionId]: value };
        answersRef.current = next;
        return next;
      }
      const selections = Array.isArray(current[questionId])
        ? (current[questionId] as string[])
        : [];
      const next = {
        ...current,
        [questionId]: selections.includes(value)
          ? selections.filter((selection) => selection !== value)
          : [...selections, value],
      };
      answersRef.current = next;
      return next;
    });
  }

  async function recordAccusation() {
    if (submitting) return;
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const response = await fetch(`/api/play/${encodeURIComponent(show.slug)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersRef.current,
          attemptId: show.attemptId,
        }),
      });
      const result = (await response.json()) as SituationResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Unable to record accusation.");
      setSituationResult(result);
      setTimerExpiresAt(null);
      setTimerRemaining(null);
      setInventoryOpen(false);
      setStage("submitted");
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to record accusation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submitAccusation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void recordAccusation();
  }

  function continueToReveal() {
    setCountdown(5);
    setStage("countdown");
    void saveProgress({ stage: "COUNTDOWN" });
  }

  const videoTitle =
    stage === "intro"
      ? show.introTitle || "Introduction"
      : stage === "act-one"
        ? show.actOneTitle
        : show.actTwoTitle;

  return (
    <div className={`case-room stage-${stage}`} ref={roomRef}>
      {stage === "briefing" && (
        <section className="case-briefing">
          <p className="eyebrow">{show.title}</p>
          <h1>Watch carefully. Take notes.</h1>
          <p>
            You may pause or review the previous 30 seconds during Act One.
            Once Act One ends, you cannot return to it.
          </p>
          <div className="briefing-rules">
            <span>Pause anytime</span>
            <span>Review 30 seconds</span>
            <span>No return after Act One</span>
          </div>
          {startError && <p role="alert">{startError}</p>}
          <button
            className="button button-primary"
            onClick={() => void startShow()}
            type="button"
          >
            Begin {show.title}
          </button>
        </section>
      )}

      {(stage === "intro" ||
        stage === "act-one" ||
        stage === "act-two") && (
        <section className="video-stage live-video-stage">
          {activeVideoId ? (
            <video
              autoPlay
              key={`${stage}-${activeVideoId}-${videoReloadKey}`}
              playsInline
              ref={videoRef}
            />
          ) : (
            <div className="video-configuration-error">
              <p className="eyebrow">Video configuration required</p>
              <h1>{videoTitle}</h1>
              <p>
                Add this video’s Cloudflare Stream UID or complete embed URL in
                Show setup.
              </p>
            </div>
          )}
          {videoError && activeVideoId && (
            <div className="video-playback-error" role="alert">
              <p className="eyebrow">
                {autoplayBlocked ? "Playback ready" : "Playback interrupted"}
              </p>
              <h2>
                {autoplayBlocked
                  ? "Start Act Two when you are ready."
                  : "Your investigation is still safe."}
              </h2>
              <p>{videoError}</p>
              <button
                className="button button-primary"
                onClick={retryVideo}
                type="button"
              >
                {autoplayBlocked ? "Start Act Two" : "Retry video"}
              </button>
            </div>
          )}
          <div className="live-video-heading">
            <p>
              {stage === "intro"
                ? "Introduction"
                : stage === "act-one"
                  ? "Act One"
                  : "Act Two"}
            </p>
            <h1>{videoTitle}</h1>
          </div>
          <div className="video-progress" aria-label="Playback progress">
            <span
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="video-time">
            <span>{formatTime(currentTime)} elapsed</span>
            <span aria-hidden="true"> · </span>
            <span>
              {duration
                ? `${formatTime(Math.max(0, duration - currentTime))} remaining`
                : "Calculating remaining time…"}
            </span>
          </div>
          <button
            className="fullscreen-control"
            onClick={() =>
              document.fullscreenElement
                ? void document.exitFullscreen()
                : void roomRef.current?.requestFullscreen()
            }
            type="button"
          >
            ⛶ <span>Full screen</span>
          </button>
          <div className="playback-controls">
            <button onClick={() => seekBy(-30)} type="button">
              <strong>↶</strong><span>Back 30</span>
            </button>
            {isAdmin && (
              <button onClick={() => seekBy(30)} type="button">
                <strong>↷</strong><span>Forward 30</span>
              </button>
            )}
            <button onClick={togglePlayback} type="button">
              <strong>{playing ? "Ⅱ" : "▶"}</strong>
              <span>{playing ? "Pause" : "Play"}</span>
            </button>
          </div>
          {isAdmin && stage === "act-one" && (
            <button
              className="prototype-skip"
              onClick={moveToIntermission}
              type="button"
            >
              Admin: enter Intermission
            </button>
          )}
          {isAdmin && stage === "act-two" && (
            <button
              className="prototype-skip"
              onClick={() => {
                setStage("situation-room");
                void saveProgress({ stage: "SITUATION_ROOM" });
              }}
              type="button"
            >
              Admin: finish Act Two
            </button>
          )}
        </section>
      )}

      {stage === "intermission" && (
        <section className="decision-room">
          <div className="intermission-pane">
            {show.intermissionMediaType === "VIDEO" &&
            show.intermissionVideoId ? (
              <iframe
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="intermission-stream"
                src={streamUrl(
                  show.intermissionVideoId,
                  show.intermissionVideoLoops,
                )}
                title={`${show.title}: ${show.intermissionTitle}`}
              />
            ) : (
              <div
                className="intermission-media blotter-heading"
                style={
                  show.intermissionMediaType === "IMAGE" &&
                  show.intermissionImageUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(8,12,14,.35), rgba(8,12,14,.7)), url("${show.intermissionImageUrl}")`,
                      }
                    : undefined
                }
              >
                <p className="eyebrow">The desk</p>
                <h2>{show.intermissionTitle}</h2>
              </div>
            )}
            <IntermissionPages links={show.intermissionLinks} />
          </div>
          <div className="accusation-pane">
            <p className="eyebrow">Final decision</p>
            <h2>Make your accusation.</h2>
            {show.accusationTimed && timerRemaining !== null && (
              <div
                className={`accusation-timer ${
                  timerRemaining <= (show.timerWarningSeconds ?? 60)
                    ? "warning"
                    : ""
                }`}
                role="timer"
                aria-live={
                  timerRemaining <= (show.timerWarningSeconds ?? 60)
                    ? "assertive"
                    : "polite"
                }
              >
                <span>Time remaining</span>
                <strong>{formatTime(timerRemaining)}</strong>
                <small>
                  {timerRemaining > 0
                    ? "The timer continues even if intermission media is paused."
                    : show.timerExpirationAction === "MARK_UNANSWERED_INCORRECT"
                      ? "Time is up. Unanswered questions are being marked incorrect."
                      : "Time is up. Your current answers are being submitted."}
                </small>
              </div>
            )}
            {show.questions.length ? (
              <form onSubmit={submitAccusation}>
                {show.questions.map((question) => (
                  <fieldset key={question.id}>
                    <legend>{question.prompt}</legend>
                    {question.type === "SHORT_TEXT" ? (
                      <textarea
                        onChange={(event) =>
                          updateAnswer(question.id, event.target.value)
                        }
                        required={question.required}
                        rows={3}
                        value={(answers[question.id] as string) ?? ""}
                      />
                    ) : (
                      question.choices.map((choice) => {
                        const isMultiple =
                          question.type === "MULTIPLE_CHOICE";
                        const checked = isMultiple
                          ? (
                              (answers[question.id] as string[]) ?? []
                            ).includes(choice.id)
                          : answers[question.id] === choice.id;
                        return (
                          <label className="choice-card" key={choice.id}>
                            <input
                              checked={checked}
                              name={question.id}
                              onChange={() =>
                                updateAnswer(
                                  question.id,
                                  choice.id,
                                  isMultiple,
                                )
                              }
                              required={question.required && !isMultiple}
                              type={isMultiple ? "checkbox" : "radio"}
                              value={choice.id}
                            />
                            <span
                              className="choice-control"
                              aria-hidden="true"
                            />
                            <span>{choice.label}</span>
                          </label>
                        );
                      })
                    )}
                  </fieldset>
                ))}
                <p className="submission-warning">
                  Answers cannot be changed after submission.
                </p>
                {submissionError && (
                  <p className="form-error" role="alert">{submissionError}</p>
                )}
                <button
                  className="button button-primary"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "Recording accusation…" : "Submit final accusation"}
                </button>
              </form>
            ) : (
              <div className="player-empty-questions">
                <p>No accusation questions are configured yet.</p>
                {isAdmin && (
                  <p>Add questions in Admin → Questions &amp; answers.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {stage === "submitted" && (
        <section className="submission-confirmation">
          <span className="confirmation-mark">✓</span>
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
          <strong key={countdown}>{countdown}</strong>
        </section>
      )}

      {stage === "situation-room" && situationResult && (
        <SituationRoom
          detectiveGaugeEnabled={show.detectiveGaugeEnabled}
          earnedRank={situationResult.earnedRank}
          musicEnabledInitially={show.resultsMusicEnabled}
          musicUrl={show.resultsMusicUrl}
          onComplete={() => {
            void fetch(
              `/api/play/${encodeURIComponent(show.slug)}/submit?attemptId=${encodeURIComponent(show.attemptId)}`,
              {
              method: "PATCH",
              },
            );
          }}
          questions={situationResult.questions}
          ranks={situationResult.ranks}
          scorePercent={situationResult.scorePercent}
          title={show.situationRoomTitle}
          vaultTransitionEnabled={show.vaultTransitionEnabled}
        />
      )}

      {(show.inventoryEnabled || show.evidence.length > 0) &&
        (stage === "act-one" ||
          stage === "intermission" ||
          stage === "act-two") && (
          <>
            <button
              className={`briefcase-button ${inventoryOpen ? "open" : ""}`}
              onClick={() => {
                setInventoryOpen((open) => !open);
                setSelectedEvidence(null);
              }}
              type="button"
            >
              <span className="briefcase-icon">▰</span>
              <span>Case Inventory</span>
              <strong>{unlockedEvidence.length}</strong>
            </button>
            {inventoryOpen && (
              <aside className="inventory-drawer">
                <div className="inventory-heading">
                  <div>
                    <p className="eyebrow">Evidence collected</p>
                    <h2>Case Inventory</h2>
                  </div>
                  <button
                    onClick={() => setInventoryOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <div className="evidence-list">
                  {unlockedEvidence.map((clue) => (
                    <button
                      className="evidence-card"
                      key={clue.id}
                      onClick={() => setSelectedEvidence(clue)}
                      type="button"
                    >
                      <span
                        style={
                          clue.iconUrl
                            ? {
                                backgroundImage: `url("${clue.iconUrl}")`,
                                backgroundSize: "cover",
                              }
                            : undefined
                        }
                      >
                        {clue.iconUrl ? "" : "CLUE"}
                      </span>
                      <strong>{clue.title}</strong>
                    </button>
                  ))}
                  {!unlockedEvidence.length && (
                    <p>No clues have unlocked yet.</p>
                  )}
                </div>
              </aside>
            )}
            {selectedEvidence && (
              <div
                aria-modal="true"
                className="evidence-modal"
                role="dialog"
              >
                <article>
                  <button
                    aria-label="Close evidence"
                    className="evidence-close"
                    onClick={() => setSelectedEvidence(null)}
                    type="button"
                  >
                    ×
                  </button>
                  {selectedEvidence.fileUrl && (
                    <img
                      alt={selectedEvidence.title}
                      className="evidence-file-image"
                      src={selectedEvidence.fileUrl}
                    />
                  )}
                  <p className="eyebrow">Evidence item</p>
                  <h2>{selectedEvidence.title}</h2>
                  {selectedEvidence.description && (
                    <p>{selectedEvidence.description}</p>
                  )}
                </article>
              </div>
            )}
          </>
        )}
    </div>
  );
}
