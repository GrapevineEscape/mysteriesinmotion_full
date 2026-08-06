-- Preserve active playback and draft accusation answers across refreshes.
ALTER TABLE "CaseAttempt"
  ADD COLUMN "progressRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "furthestIntroSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "playbackUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "draftAnswers" JSONB;
