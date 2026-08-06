-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "ShowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'DISPUTED', 'COMPLIMENTARY');
CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'INVESTIGATING', 'READY_TO_ACCUSE', 'ACCUSATION_SUBMITTED', 'REVEAL_AVAILABLE', 'COMPLETED');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_TEXT');
CREATE TYPE "IntermissionMediaType" AS ENUM ('NONE', 'VIDEO', 'IMAGE');
CREATE TYPE "TimerExpirationAction" AS ENUM ('SUBMIT_CURRENT', 'MARK_UNANSWERED_INCORRECT');
CREATE TYPE "EvidenceUnlockStage" AS ENUM ('ACT_ONE', 'ACT_TWO');
CREATE TYPE "AnswerMatchMode" AS ENUM ('EXACT', 'NORMALIZED', 'AI_ASSISTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "introEnabled" BOOLEAN NOT NULL DEFAULT false,
    "introTitle" TEXT,
    "introVideoId" TEXT,
    "introSkippable" BOOLEAN NOT NULL DEFAULT false,
    "introReplayable" BOOLEAN NOT NULL DEFAULT false,
    "actOneTitle" TEXT NOT NULL DEFAULT 'Act One',
    "actOneVideoId" TEXT,
    "actOneCanPause" BOOLEAN NOT NULL DEFAULT true,
    "actOneRewindSeconds" INTEGER NOT NULL DEFAULT 30,
    "lockActOneAfterIntermission" BOOLEAN NOT NULL DEFAULT true,
    "intermissionTitle" TEXT NOT NULL DEFAULT 'Make Your Accusation',
    "intermissionMediaType" "IntermissionMediaType" NOT NULL DEFAULT 'NONE',
    "intermissionVideoId" TEXT,
    "intermissionImageUrl" TEXT,
    "intermissionVideoLoops" BOOLEAN NOT NULL DEFAULT true,
    "accusationTimed" BOOLEAN NOT NULL DEFAULT false,
    "accusationSeconds" INTEGER,
    "timerWarningSeconds" INTEGER,
    "timerExpirationAction" "TimerExpirationAction" NOT NULL DEFAULT 'SUBMIT_CURRENT',
    "actTwoTitle" TEXT NOT NULL DEFAULT 'The Reveal',
    "actTwoVideoId" TEXT,
    "actTwoCanPause" BOOLEAN NOT NULL DEFAULT true,
    "actTwoRewindSeconds" INTEGER NOT NULL DEFAULT 30,
    "inventoryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "situationRoomTitle" TEXT NOT NULL DEFAULT 'So, how did you do?',
    "resultsMusicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "resultsMusicUrl" TEXT,
    "vaultTransitionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "detectiveGaugeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceCents" INTEGER NOT NULL DEFAULT 1000,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "investigationMinutes" INTEGER,
    "revealMinutes" INTEGER,
    "difficulty" TEXT,
    "ageRecommendation" TEXT,
    "contentAdvisory" TEXT,
    "status" "ShowStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suspect" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isSelectable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Suspect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "pointValue" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "matchMode" "AnswerMatchMode" NOT NULL DEFAULT 'EXACT',
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiGradingRubric" TEXT,
    "resultExplanation" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnswerChoice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "suspectId" TEXT,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AnswerChoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResultTier" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minimumPercent" INTEGER NOT NULL,
    "maximumPercent" INTEGER NOT NULL,
    CONSTRAINT "ResultTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "teamName" TEXT,
    "investigationStartedAt" TIMESTAMP(3),
    "accusationSubmittedAt" TIMESTAMP(3),
    "revealStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "resultTierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmittedAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerChoiceId" TEXT,
    "writtenAnswer" TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmittedAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileMimeType" TEXT,
    "iconUrl" TEXT,
    "unlockStage" "EvidenceUnlockStage" NOT NULL DEFAULT 'ACT_ONE',
    "unlockAtSeconds" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "visibleDuringReveal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceUnlock" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Show_slug_key" ON "Show"("slug");
CREATE UNIQUE INDEX "Suspect_showId_name_key" ON "Suspect"("showId", "name");
CREATE INDEX "Suspect_showId_displayOrder_idx" ON "Suspect"("showId", "displayOrder");
CREATE INDEX "Question_showId_displayOrder_idx" ON "Question"("showId", "displayOrder");
CREATE INDEX "AnswerChoice_questionId_displayOrder_idx" ON "AnswerChoice"("questionId", "displayOrder");
CREATE INDEX "ResultTier_showId_minimumPercent_idx" ON "ResultTier"("showId", "minimumPercent");
CREATE UNIQUE INDEX "Purchase_stripeCheckoutSessionId_key" ON "Purchase"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Purchase_stripePaymentIntentId_key" ON "Purchase"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Purchase_userId_showId_key" ON "Purchase"("userId", "showId");
CREATE INDEX "Purchase_showId_status_idx" ON "Purchase"("showId", "status");
CREATE UNIQUE INDEX "CaseAttempt_userId_showId_key" ON "CaseAttempt"("userId", "showId");
CREATE INDEX "CaseAttempt_showId_status_idx" ON "CaseAttempt"("showId", "status");
CREATE UNIQUE INDEX "SubmittedAnswer_attemptId_questionId_key" ON "SubmittedAnswer"("attemptId", "questionId");
CREATE INDEX "EvidenceItem_showId_unlockStage_unlockAtSeconds_idx" ON "EvidenceItem"("showId", "unlockStage", "unlockAtSeconds");
CREATE INDEX "EvidenceItem_showId_displayOrder_idx" ON "EvidenceItem"("showId", "displayOrder");
CREATE UNIQUE INDEX "EvidenceUnlock_attemptId_evidenceItemId_key" ON "EvidenceUnlock"("attemptId", "evidenceItemId");
CREATE INDEX "EvidenceUnlock_attemptId_unlockedAt_idx" ON "EvidenceUnlock"("attemptId", "unlockedAt");

-- AddForeignKey
ALTER TABLE "Suspect" ADD CONSTRAINT "Suspect_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerChoice" ADD CONSTRAINT "AnswerChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerChoice" ADD CONSTRAINT "AnswerChoice_suspectId_fkey" FOREIGN KEY ("suspectId") REFERENCES "Suspect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResultTier" ADD CONSTRAINT "ResultTier_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseAttempt" ADD CONSTRAINT "CaseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseAttempt" ADD CONSTRAINT "CaseAttempt_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmittedAnswer" ADD CONSTRAINT "SubmittedAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CaseAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmittedAnswer" ADD CONSTRAINT "SubmittedAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmittedAnswer" ADD CONSTRAINT "SubmittedAnswer_answerChoiceId_fkey" FOREIGN KEY ("answerChoiceId") REFERENCES "AnswerChoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceUnlock" ADD CONSTRAINT "EvidenceUnlock_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CaseAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceUnlock" ADD CONSTRAINT "EvidenceUnlock_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
