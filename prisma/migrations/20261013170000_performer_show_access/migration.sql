-- Performer invitations can limit which shows the person may open.
ALTER TABLE "User" ADD COLUMN "showAccessRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TroupeInvite" ADD COLUMN "showIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "PerformerShowAccess" (
    "userId" TEXT NOT NULL,
    "showId" TEXT NOT NULL,

    CONSTRAINT "PerformerShowAccess_pkey" PRIMARY KEY ("userId","showId")
);

CREATE INDEX "PerformerShowAccess_showId_idx" ON "PerformerShowAccess"("showId");

ALTER TABLE "PerformerShowAccess" ADD CONSTRAINT "PerformerShowAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformerShowAccess" ADD CONSTRAINT "PerformerShowAccess_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
