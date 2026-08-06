-- Unifies the Flask troupe application into this schema.
--
-- Show becomes a shared catalog entity for both live and online productions.
-- The playback, timing, and commerce configuration that previously lived on
-- Show moves to OnlineShowDetail, and is copied across before the old columns
-- are dropped so existing show configuration is preserved.

-- CreateEnum
CREATE TYPE "ShowType" AS ENUM ('STANDARD', 'ESCAPE', 'ONLINE');

-- CreateEnum
CREATE TYPE "ShowDateStatus" AS ENUM ('DRAFT', 'OPEN', 'FULLY_CAST', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OFFERED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable: troupe profile fields on the shared user record
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "headshotUrl" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable: catalog fields on Show. Every pre-existing Show is an online
-- mystery, so the ONLINE default is correct for the backfill.
ALTER TABLE "Show" ADD COLUMN     "kidFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scriptUrl" TEXT,
ADD COLUMN     "type" "ShowType" NOT NULL DEFAULT 'ONLINE';

-- CreateTable
CREATE TABLE "OnlineShowDetail" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineShowDetail_pkey" PRIMARY KEY ("id")
);

-- Backfill: move existing online configuration off Show. The detail row reuses
-- the parent id, which is safe because the relation is one-to-one.
INSERT INTO "OnlineShowDetail" (
    "id", "showId",
    "introEnabled", "introTitle", "introVideoId", "introSkippable", "introReplayable",
    "actOneTitle", "actOneVideoId", "actOneCanPause", "actOneRewindSeconds", "lockActOneAfterIntermission",
    "intermissionTitle", "intermissionMediaType", "intermissionVideoId", "intermissionImageUrl", "intermissionVideoLoops",
    "accusationTimed", "accusationSeconds", "timerWarningSeconds", "timerExpirationAction",
    "actTwoTitle", "actTwoVideoId", "actTwoCanPause", "actTwoRewindSeconds",
    "inventoryEnabled", "situationRoomTitle", "resultsMusicEnabled", "resultsMusicUrl",
    "vaultTransitionEnabled", "detectiveGaugeEnabled",
    "priceCents", "currency", "investigationMinutes", "revealMinutes",
    "createdAt", "updatedAt"
)
SELECT
    "id", "id",
    "introEnabled", "introTitle", "introVideoId", "introSkippable", "introReplayable",
    "actOneTitle", "actOneVideoId", "actOneCanPause", "actOneRewindSeconds", "lockActOneAfterIntermission",
    "intermissionTitle", "intermissionMediaType", "intermissionVideoId", "intermissionImageUrl", "intermissionVideoLoops",
    "accusationTimed", "accusationSeconds", "timerWarningSeconds", "timerExpirationAction",
    "actTwoTitle", "actTwoVideoId", "actTwoCanPause", "actTwoRewindSeconds",
    "inventoryEnabled", "situationRoomTitle", "resultsMusicEnabled", "resultsMusicUrl",
    "vaultTransitionEnabled", "detectiveGaugeEnabled",
    "priceCents", "currency", "investigationMinutes", "revealMinutes",
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Show";

-- AlterTable: retire the online-only columns now that they are copied
ALTER TABLE "Show" DROP COLUMN "accusationSeconds",
DROP COLUMN "accusationTimed",
DROP COLUMN "actOneCanPause",
DROP COLUMN "actOneRewindSeconds",
DROP COLUMN "actOneTitle",
DROP COLUMN "actOneVideoId",
DROP COLUMN "actTwoCanPause",
DROP COLUMN "actTwoRewindSeconds",
DROP COLUMN "actTwoTitle",
DROP COLUMN "actTwoVideoId",
DROP COLUMN "currency",
DROP COLUMN "detectiveGaugeEnabled",
DROP COLUMN "intermissionImageUrl",
DROP COLUMN "intermissionMediaType",
DROP COLUMN "intermissionTitle",
DROP COLUMN "intermissionVideoId",
DROP COLUMN "intermissionVideoLoops",
DROP COLUMN "introEnabled",
DROP COLUMN "introReplayable",
DROP COLUMN "introSkippable",
DROP COLUMN "introTitle",
DROP COLUMN "introVideoId",
DROP COLUMN "inventoryEnabled",
DROP COLUMN "investigationMinutes",
DROP COLUMN "lockActOneAfterIntermission",
DROP COLUMN "priceCents",
DROP COLUMN "resultsMusicEnabled",
DROP COLUMN "resultsMusicUrl",
DROP COLUMN "revealMinutes",
DROP COLUMN "situationRoomTitle",
DROP COLUMN "timerExpirationAction",
DROP COLUMN "timerWarningSeconds",
DROP COLUMN "vaultTransitionEnabled";

-- CreateTable
CREATE TABLE "TroupeInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PERFORMER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TroupeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleApplication" (
    "id" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowDate" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ShowDateStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "customer" TEXT,
    "attendees" INTEGER,
    "notes" TEXT,
    "rehearsalTimeframe" INTEGER NOT NULL DEFAULT 14,
    "requiredRehearsals" INTEGER NOT NULL DEFAULT 4,
    "minPerformers" INTEGER,
    "maxPerformers" INTEGER,
    "techDate" TIMESTAMP(3),
    "techLocation" TEXT,
    "directorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowDateInterest" (
    "id" TEXT NOT NULL,
    "showDateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "questions" TEXT,
    "conflictTech" BOOLEAN NOT NULL DEFAULT false,
    "conflictRehearsalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowDateInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowDateAssignment" (
    "id" TEXT NOT NULL,
    "showDateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowDateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rehearsal" (
    "id" TEXT NOT NULL,
    "showDateId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rehearsal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RehearsalAvailability" (
    "id" TEXT NOT NULL,
    "rehearsalId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehearsalAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "preferredDate" DATE NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "message" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TroupeInvite_tokenHash_key" ON "TroupeInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "TroupeInvite_email_expiresAt_idx" ON "TroupeInvite"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "TroupeInvite_expiresAt_idx" ON "TroupeInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineShowDetail_showId_key" ON "OnlineShowDetail"("showId");

-- CreateIndex
CREATE INDEX "Role_showId_displayOrder_idx" ON "Role"("showId", "displayOrder");

-- CreateIndex
CREATE INDEX "RoleApplication_showId_status_idx" ON "RoleApplication"("showId", "status");

-- CreateIndex
CREATE INDEX "RoleApplication_performerId_status_idx" ON "RoleApplication"("performerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoleApplication_performerId_roleId_key" ON "RoleApplication"("performerId", "roleId");

-- CreateIndex
CREATE INDEX "ShowDate_status_date_idx" ON "ShowDate"("status", "date");

-- CreateIndex
CREATE INDEX "ShowDate_showId_date_idx" ON "ShowDate"("showId", "date");

-- CreateIndex
CREATE INDEX "ShowDate_directorId_idx" ON "ShowDate"("directorId");

-- CreateIndex
CREATE INDEX "ShowDateInterest_showDateId_roleId_idx" ON "ShowDateInterest"("showDateId", "roleId");

-- CreateIndex
CREATE INDEX "ShowDateInterest_performerId_idx" ON "ShowDateInterest"("performerId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowDateInterest_showDateId_roleId_performerId_key" ON "ShowDateInterest"("showDateId", "roleId", "performerId");

-- CreateIndex
CREATE INDEX "ShowDateAssignment_showDateId_status_idx" ON "ShowDateAssignment"("showDateId", "status");

-- CreateIndex
CREATE INDEX "ShowDateAssignment_performerId_status_idx" ON "ShowDateAssignment"("performerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShowDateAssignment_showDateId_roleId_key" ON "ShowDateAssignment"("showDateId", "roleId");

-- CreateIndex
CREATE INDEX "Rehearsal_showDateId_date_idx" ON "Rehearsal"("showDateId", "date");

-- CreateIndex
CREATE INDEX "RehearsalAvailability_performerId_idx" ON "RehearsalAvailability"("performerId");

-- CreateIndex
CREATE UNIQUE INDEX "RehearsalAvailability_rehearsalId_performerId_key" ON "RehearsalAvailability"("rehearsalId", "performerId");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_showId_idx" ON "Booking"("showId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Show_type_status_displayOrder_idx" ON "Show"("type", "status", "displayOrder");

-- AddForeignKey
ALTER TABLE "TroupeInvite" ADD CONSTRAINT "TroupeInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineShowDetail" ADD CONSTRAINT "OnlineShowDetail_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleApplication" ADD CONSTRAINT "RoleApplication_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDate" ADD CONSTRAINT "ShowDate_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDate" ADD CONSTRAINT "ShowDate_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateInterest" ADD CONSTRAINT "ShowDateInterest_showDateId_fkey" FOREIGN KEY ("showDateId") REFERENCES "ShowDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateInterest" ADD CONSTRAINT "ShowDateInterest_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateInterest" ADD CONSTRAINT "ShowDateInterest_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateAssignment" ADD CONSTRAINT "ShowDateAssignment_showDateId_fkey" FOREIGN KEY ("showDateId") REFERENCES "ShowDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateAssignment" ADD CONSTRAINT "ShowDateAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowDateAssignment" ADD CONSTRAINT "ShowDateAssignment_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rehearsal" ADD CONSTRAINT "Rehearsal_showDateId_fkey" FOREIGN KEY ("showDateId") REFERENCES "ShowDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehearsalAvailability" ADD CONSTRAINT "RehearsalAvailability_rehearsalId_fkey" FOREIGN KEY ("rehearsalId") REFERENCES "Rehearsal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RehearsalAvailability" ADD CONSTRAINT "RehearsalAvailability_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
