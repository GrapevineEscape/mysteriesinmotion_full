-- Preserve every existing attempt while allowing additional playthroughs.
DROP INDEX IF EXISTS "CaseAttempt_userId_showId_key";

CREATE INDEX "CaseAttempt_userId_showId_createdAt_idx"
ON "CaseAttempt"("userId", "showId", "createdAt");

-- A customer can have many historical attempts, but only one open playthrough.
CREATE UNIQUE INDEX "CaseAttempt_one_active_per_show_key"
ON "CaseAttempt"("userId", "showId")
WHERE "accusationSubmittedAt" IS NULL;
