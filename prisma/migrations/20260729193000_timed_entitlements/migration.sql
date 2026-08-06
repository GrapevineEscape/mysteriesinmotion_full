-- Keep every $10 purchase as a separate entitlement so repurchases preserve
-- their own Square transaction, access window, attempts, and refund history.
DROP INDEX IF EXISTS "Purchase_userId_showId_key";

ALTER TABLE "Purchase"
  ADD COLUMN "startByAt" TIMESTAMP(3),
  ADD COLUMN "playWindowStartedAt" TIMESTAMP(3),
  ADD COLUMN "playWindowEndsAt" TIMESTAMP(3);

CREATE INDEX "Purchase_userId_showId_status_createdAt_idx"
ON "Purchase"("userId", "showId", "status", "createdAt");

ALTER TABLE "CaseAttempt"
  ADD COLUMN "purchaseId" TEXT;

-- Existing installations allowed only one purchase per customer and show, so
-- every historical attempt can be connected to that existing entitlement.
UPDATE "CaseAttempt" AS attempt
SET "purchaseId" = purchase."id"
FROM "Purchase" AS purchase
WHERE purchase."userId" = attempt."userId"
  AND purchase."showId" = attempt."showId";

ALTER TABLE "CaseAttempt"
  ADD CONSTRAINT "CaseAttempt_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CaseAttempt_purchaseId_createdAt_idx"
ON "CaseAttempt"("purchaseId", "createdAt");

-- Existing paid and complimentary access receives a full year to begin.
UPDATE "Purchase"
SET "startByAt" = CURRENT_TIMESTAMP + INTERVAL '1 year'
WHERE "status" IN ('PAID', 'COMPLIMENTARY')
  AND "startByAt" IS NULL;

-- If an existing customer has already streamed, preserve that evidence while
-- granting a fresh 48-hour replay window from this deployment.
WITH first_playback AS (
  SELECT
    "purchaseId",
    MIN("investigationStartedAt") AS "startedAt"
  FROM "CaseAttempt"
  WHERE "purchaseId" IS NOT NULL
    AND "investigationStartedAt" IS NOT NULL
  GROUP BY "purchaseId"
)
UPDATE "Purchase" AS purchase
SET
  "playWindowStartedAt" = first_playback."startedAt",
  "playWindowEndsAt" = CURRENT_TIMESTAMP + INTERVAL '48 hours'
FROM first_playback
WHERE purchase."id" = first_playback."purchaseId";

-- Only one unfinished game may exist per customer and show. Older submitted
-- attempts are completed before strengthening the existing partial index.
WITH ranked_open_attempts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "showId"
      ORDER BY "createdAt" DESC
    ) AS row_number
  FROM "CaseAttempt"
  WHERE "completedAt" IS NULL
)
UPDATE "CaseAttempt"
SET
  "completedAt" = COALESCE("accusationSubmittedAt", "updatedAt"),
  "status" = 'COMPLETED',
  "playbackStage" = 'COMPLETED'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_open_attempts
  WHERE row_number > 1
);

DROP INDEX IF EXISTS "CaseAttempt_one_active_per_show_key";

CREATE UNIQUE INDEX "CaseAttempt_one_active_per_show_key"
ON "CaseAttempt"("userId", "showId")
WHERE "completedAt" IS NULL;
