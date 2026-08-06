-- Authentication uses one-time email codes and opaque, hashed sessions.
CREATE TABLE "EmailLoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "EmailLoginCode_email_expiresAt_idx" ON "EmailLoginCode"("email", "expiresAt");
CREATE INDEX "EmailLoginCode_expiresAt_idx" ON "EmailLoginCode"("expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Square is the selected payment provider. Legacy columns remain untouched.
ALTER TABLE "Purchase"
  ADD COLUMN "squareCustomerId" TEXT,
  ADD COLUMN "squareOrderId" TEXT,
  ADD COLUMN "squarePaymentId" TEXT,
  ADD COLUMN "squareReceiptUrl" TEXT;
CREATE UNIQUE INDEX "Purchase_squareOrderId_key" ON "Purchase"("squareOrderId");
CREATE UNIQUE INDEX "Purchase_squarePaymentId_key" ON "Purchase"("squarePaymentId");

-- Server-owned progress makes rewinds harmless and the Act One lock enforceable.
ALTER TABLE "CaseAttempt"
  ADD COLUMN "playbackStage" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "furthestActOneSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "furthestActTwoSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "intermissionStartedAt" TIMESTAMP(3),
  ADD COLUMN "timerExpiresAt" TIMESTAMP(3),
  ADD COLUMN "maximumScore" INTEGER,
  ADD COLUMN "scorePercent" INTEGER;

-- Multiple-choice submissions use a join table; the legacy single-choice column remains.
ALTER TABLE "SubmittedAnswer"
  ADD COLUMN "isCorrect" BOOLEAN,
  ADD COLUMN "gradingMethod" TEXT,
  ADD COLUMN "gradingReason" TEXT;

CREATE TABLE "SubmittedAnswerChoice" (
    "answerId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    CONSTRAINT "SubmittedAnswerChoice_pkey" PRIMARY KEY ("answerId", "choiceId")
);
CREATE INDEX "SubmittedAnswerChoice_choiceId_idx" ON "SubmittedAnswerChoice"("choiceId");
ALTER TABLE "SubmittedAnswerChoice" ADD CONSTRAINT "SubmittedAnswerChoice_answerId_fkey"
  FOREIGN KEY ("answerId") REFERENCES "SubmittedAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmittedAnswerChoice" ADD CONSTRAINT "SubmittedAnswerChoice_choiceId_fkey"
  FOREIGN KEY ("choiceId") REFERENCES "AnswerChoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed only confirmed facts. Content-specific questions, clues, and solutions remain admin-entered.
INSERT INTO "Show" (
  "id", "title", "slug", "shortDescription", "fullDescription",
  "priceCents", "currency", "status", "displayOrder", "createdAt", "updatedAt"
) VALUES
  (
    'show_missing_millions', 'Missing Millions', 'missing-millions',
    'A large sum has vanished from FocusTec Laboratories.',
    'The CEO of FocusTec Laboratories calls an emergency meeting after a large sum of money goes missing. Watch closely—the culprit may be on the call.',
    1000, 'usd', 'DRAFT', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'show_dog_show_debacle', 'Dog Show Debacle', 'dog-show-debacle',
    'A beloved pup disappears during the Sittensteigh Dog Show.',
    'The Best in Show winner is about to be announced at the Sittensteigh Dog Show when the lights suddenly go out. When they return, a beloved pup is missing.',
    1000, 'usd', 'DRAFT', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'show_holiday_inheritance', 'Holiday Inheritance', 'holiday-inheritance',
    'A family inheritance becomes a murder investigation.',
    'The Bradford family gathers to hear Daddy''s will and learn who will inherit his fortune—only to discover that his death was not from natural causes.',
    1000, 'usd', 'DRAFT', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "shortDescription" = EXCLUDED."shortDescription",
  "fullDescription" = EXCLUDED."fullDescription",
  "priceCents" = 1000,
  "updatedAt" = CURRENT_TIMESTAMP;
