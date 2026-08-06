/**
 * Prints a row count for every table that carries meaningful content, so a
 * developer can tell at a glance whether a database is empty, seeded, or
 * holding migrated production data.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const counts = {
  users: () => db.user.count(),
  shows: () => db.show.count(),
  onlineDetails: () => db.onlineShowDetail.count(),
  roles: () => db.role.count(),
  roleApplications: () => db.roleApplication.count(),
  showDates: () => db.showDate.count(),
  showDateAssignments: () => db.showDateAssignment.count(),
  showDateInterest: () => db.showDateInterest.count(),
  rehearsals: () => db.rehearsal.count(),
  rehearsalAvailability: () => db.rehearsalAvailability.count(),
  bookings: () => db.booking.count(),
  troupeInvites: () => db.troupeInvite.count(),
  suspects: () => db.suspect.count(),
  questions: () => db.question.count(),
  answerChoices: () => db.answerChoice.count(),
  evidenceItems: () => db.evidenceItem.count(),
  resultTiers: () => db.resultTier.count(),
  purchases: () => db.purchase.count(),
  caseAttempts: () => db.caseAttempt.count(),
};

try {
  const rows = [];
  for (const [label, count] of Object.entries(counts)) {
    rows.push({ table: label, rows: await count() });
  }
  console.table(rows);
} finally {
  await db.$disconnect();
}
