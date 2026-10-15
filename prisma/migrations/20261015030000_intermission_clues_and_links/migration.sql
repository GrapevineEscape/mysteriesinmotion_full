ALTER TYPE "EvidenceUnlockStage" ADD VALUE 'INTERMISSION';

ALTER TABLE "OnlineShowDetail" ADD COLUMN "intermissionLinks" JSONB NOT NULL DEFAULT '[]';
