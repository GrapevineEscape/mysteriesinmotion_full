/**
 * Applies every migration in order against an ephemeral Postgres (PGlite) and
 * asserts that the catalog split preserved existing online show configuration.
 *
 * Run with: npm run verify:migrations
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failures.push(label);
  }
}

async function migrationDirs() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Prisma applies each migration file in its own transaction. Mirroring that
 * here is what makes this a real test of the enum-value split.
 */
async function applyMigration(db, name) {
  const sql = await readFile(
    path.join(MIGRATIONS_DIR, name, "migration.sql"),
    "utf8",
  );
  await db.exec(`BEGIN;\n${sql}\nCOMMIT;`);
}

async function main() {
  const db = new PGlite();
  const all = await migrationDirs();

  const splitAt = all.indexOf("20260806120000_add_performer_role");
  if (splitAt === -1) {
    throw new Error("Could not locate the new migrations.");
  }
  const preExisting = all.slice(0, splitAt);
  const added = all.slice(splitAt);

  console.log(`Applying ${preExisting.length} pre-existing migrations...`);
  for (const name of preExisting) {
    await applyMigration(db, name);
    console.log(`  applied ${name}`);
  }

  // Seed a show whose configuration has been customised away from defaults, so
  // the backfill has something meaningful to preserve.
  console.log("\nSeeding a customised online show before the split...");
  await db.exec(`
    INSERT INTO "Show" (
      "id", "title", "slug", "shortDescription", "fullDescription",
      "actOneVideoId", "actOneRewindSeconds", "priceCents", "currency",
      "accusationTimed", "accusationSeconds", "situationRoomTitle",
      "intermissionMediaType", "timerExpirationAction",
      "investigationMinutes", "difficulty", "status", "updatedAt"
    ) VALUES (
      'show_probe', 'Probe Case', 'probe-case', 'short', 'full',
      'cf-video-abc', 15, 2500, 'usd',
      true, 900, 'Custom results heading',
      'VIDEO', 'MARK_UNANSWERED_INCORRECT',
      42, 'Hard', 'PUBLISHED', CURRENT_TIMESTAMP
    );
  `);

  const beforeCount = await db.query(`SELECT COUNT(*)::int AS n FROM "Show";`);
  console.log(`  seeded, Show rows: ${beforeCount.rows[0].n}`);

  console.log(`\nApplying ${added.length} new migrations...`);
  for (const name of added) {
    await applyMigration(db, name);
    console.log(`  applied ${name}`);
  }

  console.log("\nVerifying the catalog split preserved configuration:");
  const detail = await db.query(
    `SELECT * FROM "OnlineShowDetail" WHERE "showId" = 'show_probe';`,
  );
  check("one OnlineShowDetail row was backfilled", detail.rows.length === 1);

  if (detail.rows.length === 1) {
    const row = detail.rows[0];
    check("actOneVideoId preserved", row.actOneVideoId === "cf-video-abc", String(row.actOneVideoId));
    check("actOneRewindSeconds preserved (non-default)", row.actOneRewindSeconds === 15, String(row.actOneRewindSeconds));
    check("priceCents preserved (non-default)", row.priceCents === 2500, String(row.priceCents));
    check("accusationTimed preserved", row.accusationTimed === true, String(row.accusationTimed));
    check("accusationSeconds preserved", row.accusationSeconds === 900, String(row.accusationSeconds));
    check("situationRoomTitle preserved", row.situationRoomTitle === "Custom results heading", String(row.situationRoomTitle));
    check("intermissionMediaType enum preserved", row.intermissionMediaType === "VIDEO", String(row.intermissionMediaType));
    check("timerExpirationAction enum preserved", row.timerExpirationAction === "MARK_UNANSWERED_INCORRECT", String(row.timerExpirationAction));
    check("investigationMinutes preserved", row.investigationMinutes === 42, String(row.investigationMinutes));
  }

  console.log("\nVerifying Show retained catalog fields and shed online ones:");
  const show = await db.query(`SELECT * FROM "Show" WHERE "id" = 'show_probe';`);
  const showRow = show.rows[0];
  check("title retained", showRow.title === "Probe Case");
  check("difficulty retained on Show", showRow.difficulty === "Hard", String(showRow.difficulty));
  check("type defaulted to ONLINE for existing rows", showRow.type === "ONLINE", String(showRow.type));
  check("kidFriendly added", showRow.kidFriendly === false);
  check("scriptUrl added", "scriptUrl" in showRow);
  check("priceCents removed from Show", !("priceCents" in showRow));
  check("actOneVideoId removed from Show", !("actOneVideoId" in showRow));
  check("situationRoomTitle removed from Show", !("situationRoomTitle" in showRow));

  console.log("\nVerifying new troupe tables exist:");
  const expectedTables = [
    "TroupeInvite",
    "OnlineShowDetail",
    "Role",
    "RoleApplication",
    "ShowDate",
    "ShowDateInterest",
    "ShowDateAssignment",
    "Rehearsal",
    "RehearsalAvailability",
    "Booking",
  ];
  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
  );
  const present = new Set(tables.rows.map((r) => r.table_name));
  for (const name of expectedTables) {
    check(`table ${name}`, present.has(name));
  }

  const bookingShowId = await db.query(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_name = 'Booking' AND column_name = 'showId';`,
  );
  check(
    "Booking.showId is optional for Broadcast enquiries",
    bookingShowId.rows[0]?.is_nullable === "YES",
    String(bookingShowId.rows[0]?.is_nullable),
  );

  console.log("\nVerifying PERFORMER role is usable:");
  await db.exec(
    `INSERT INTO "User" ("id","email","role","updatedAt") VALUES ('u_perf','perf@example.com','PERFORMER',CURRENT_TIMESTAMP);`,
  );
  const perf = await db.query(`SELECT "role" FROM "User" WHERE "id" = 'u_perf';`);
  check("user stored with PERFORMER role", perf.rows[0].role === "PERFORMER");

  const invite = await db.query(
    `SELECT column_default FROM information_schema.columns
     WHERE table_name = 'TroupeInvite' AND column_name = 'role';`,
  );
  check(
    "TroupeInvite.role defaults to PERFORMER",
    String(invite.rows[0].column_default).includes("PERFORMER"),
    String(invite.rows[0].column_default),
  );

  console.log("\nVerifying casting constraints hold:");
  await db.exec(`
    INSERT INTO "Show" ("id","title","slug","shortDescription","fullDescription","type","updatedAt")
      VALUES ('show_live','Live One','live-one','s','f','STANDARD',CURRENT_TIMESTAMP);
    INSERT INTO "Role" ("id","showId","name","gender","age","description","updatedAt")
      VALUES ('role_a','show_live','Detective','Any','30s','Lead',CURRENT_TIMESTAMP);
    INSERT INTO "ShowDate" ("id","showId","date","updatedAt")
      VALUES ('sd_a','show_live',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO "ShowDateAssignment" ("id","showDateId","roleId","performerId","updatedAt")
      VALUES ('asg_a','sd_a','role_a','u_perf',CURRENT_TIMESTAMP);
  `);

  let secondSeatRejected = false;
  try {
    await db.exec(`
      INSERT INTO "User" ("id","email","role","updatedAt") VALUES ('u_perf2','p2@example.com','PERFORMER',CURRENT_TIMESTAMP);
      INSERT INTO "ShowDateAssignment" ("id","showDateId","roleId","performerId","updatedAt")
        VALUES ('asg_b','sd_a','role_a','u_perf2',CURRENT_TIMESTAMP);
    `);
  } catch {
    secondSeatRejected = true;
  }
  check("one seat per role per show date is enforced", secondSeatRejected);

  await db.exec(`
    INSERT INTO "ShowDateInterest" ("id","showDateId","roleId","performerId","updatedAt")
      VALUES ('int_a','sd_a','role_a','u_perf',CURRENT_TIMESTAMP);
  `);
  let dupInterestRejected = false;
  try {
    await db.exec(`
      INSERT INTO "ShowDateInterest" ("id","showDateId","roleId","performerId","updatedAt")
        VALUES ('int_b','sd_a','role_a','u_perf',CURRENT_TIMESTAMP);
    `);
  } catch {
    dupInterestRejected = true;
  }
  check("duplicate interest for same performer/role/date is rejected", dupInterestRejected);

  const interest = await db.query(
    `SELECT "conflictRehearsalIds", "conflictTech" FROM "ShowDateInterest" WHERE "id" = 'int_a';`,
  );
  check(
    "conflictRehearsalIds defaults to empty array",
    Array.isArray(interest.rows[0].conflictRehearsalIds) &&
      interest.rows[0].conflictRehearsalIds.length === 0,
    JSON.stringify(interest.rows[0].conflictRehearsalIds),
  );

  await db.close();

  console.log("");
  if (failures.length > 0) {
    console.error(`${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("All migration checks passed.");
}

main().catch((error) => {
  console.error("\nVerification crashed:");
  console.error(error);
  process.exit(1);
});
