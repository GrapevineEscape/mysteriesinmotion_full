import type { SituationResult } from "@/lib/situation-room-types";

export type PlayStage =
  | "NOT_STARTED"
  | "INTRO"
  | "ACT_ONE"
  | "INTERMISSION"
  | "ACCUSATION_SUBMITTED"
  | "COUNTDOWN"
  | "ACT_TWO"
  | "SITUATION_ROOM"
  | "COMPLETED";

export type DraftAnswers = Record<string, string | string[]>;

export type PlayProgress = {
  draftAnswers: DraftAnswers;
  furthestActOneSeconds: number;
  furthestActTwoSeconds: number;
  furthestIntroSeconds: number;
  intermissionStartedAt: string | null;
  progressRevision: number;
  stage: PlayStage;
  timerExpiresAt: string | null;
  unlockedEvidenceIds: string[];
};

export type PlayProgressResponse = PlayProgress & {
  situationResult?: SituationResult | null;
};
