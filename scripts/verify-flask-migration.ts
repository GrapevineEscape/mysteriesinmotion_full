/**
 * Exercises the Flask migration end to end against two throwaway databases: a
 * simulated Flask schema as the source, and the unified schema as the target.
 *
 * The migration will be run once, against data that cannot be recreated, so the
 * risky parts are pinned down here first: reading naive timestamps in the right
 * timezone, collapsing duplicate roster requests, remapping integer keys, and
 * behaving the same way when run twice.
 *
 * Run with: npm run verify:migration
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
// @ts-expect-error -- plain JS helper, shared with the migration checks.
import { startEphemeralPostgres } from "./ephemeral-postgres.mjs";
import { DryRunComplete, readFlask, transfer, type Args } from "./flask-migration";

const run = promisify(execFile);
const failures: string[] = [];

async function check(label: string, assertion: () => void | Promise<void>) {
  try {
    await assertion();
    console.log(`  ok    ${label}`);
  } catch (error) {
    console.log(`  FAIL  ${label}`);
    for (const line of (error as Error).message.split("\n").slice(0, 14)) {
      console.log(`        ${line}`);
    }
    failures.push(label);
  }
}

/** The Flask schema, transcribed from MIM Website/app/models.py. */
const FLASK_SCHEMA = `
CREATE TABLE "user" (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  address VARCHAR(100),
  phone VARCHAR(20),
  bio TEXT,
  headshot_path VARCHAR(200)
);
CREATE TABLE show (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  kid_friendly BOOLEAN DEFAULT FALSE,
  script_path VARCHAR(255),
  image_path VARCHAR(255)
);
CREATE TABLE role (
  id SERIAL PRIMARY KEY,
  show_id INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age VARCHAR(20) NOT NULL,
  description TEXT NOT NULL
);
CREATE TABLE role_application (
  id SERIAL PRIMARY KEY,
  performer_id INTEGER NOT NULL,
  show_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  applied_at TIMESTAMP
);
CREATE TABLE show_date (
  id SERIAL PRIMARY KEY,
  show_id INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft',
  location VARCHAR(100),
  customer VARCHAR(100),
  attendees INTEGER,
  notes TEXT,
  rehearsal_timeframe INTEGER DEFAULT 14,
  required_rehearsals INTEGER DEFAULT 4,
  min_performers INTEGER,
  max_performers INTEGER,
  director_id INTEGER,
  tech_date TIMESTAMP,
  tech_location VARCHAR(100)
);
CREATE TABLE show_date_interest (
  id SERIAL PRIMARY KEY,
  show_date_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  performer_id INTEGER NOT NULL,
  questions TEXT,
  conflict_tech BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_rehearsal_ids JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
CREATE TABLE show_date_assignment (
  id SERIAL PRIMARY KEY,
  show_date_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  performer_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Offered',
  updated_at TIMESTAMP
);
CREATE TABLE rehearsal (
  id SERIAL PRIMARY KEY,
  show_date_id INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  location VARCHAR(100) NOT NULL,
  notes TEXT
);
CREATE TABLE rehearsal_availability (
  id SERIAL PRIMARY KEY,
  rehearsal_id INTEGER NOT NULL,
  performer_id INTEGER NOT NULL,
  status VARCHAR(20),
  note TEXT
);
CREATE TABLE booking (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  show_id INTEGER NOT NULL,
  preferred_date DATE NOT NULL,
  guest_count INTEGER NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP
);
`;

/**
 * Data chosen to include the awkward cases: a duplicate email, a performer who
 * applied for the same role twice with different outcomes, an unfamiliar show
 * type, a role belonging to no show, a summer and a winter performance, and a
 * conflict pointing at a rehearsal.
 */
const FLASK_FIXTURES = `
INSERT INTO "user" (first_name, last_name, email, password_hash, is_admin, phone, bio, headshot_path) VALUES
  ('Ada',  'Byron',   'ada@example.test',  'pbkdf2:x', TRUE,  '5125550001', 'Director',  '/static/uploads/1_headshot.png'),
  ('Grace','Hopper',  'grace@example.test','pbkdf2:x', FALSE, '5125550002', 'Performer', NULL),
  ('Alan', 'Turing',  'ALAN@example.test', 'pbkdf2:x', FALSE, NULL,         NULL,        NULL),
  ('Alan', 'Turing',  'alan@example.test', 'pbkdf2:x', FALSE, NULL,         NULL,        NULL);

INSERT INTO show (title, description, type, kid_friendly, script_path, image_path) VALUES
  ('Murder for Real', 'A whodunnit.',  'Standard',       FALSE, '/static/MIMscripts/Murder for Real_script.pdf', NULL),
  ('Dog Show Debacle','Family fun.',   'Standard',       TRUE,  NULL, '/static/uploads/Dog Show Debacle_image.png'),
  ('The Vanishing',   'Streamed.',     'Online Mystery', FALSE, NULL, NULL),
  ('Odd One Out',     'Unusual type.', 'Dinner Theatre', FALSE, NULL, NULL);

INSERT INTO role (show_id, name, gender, age, description) VALUES
  (1, 'Detective', 'Any', '30s', 'Leads the investigation'),
  (1, 'Suspect',   'F',   '40s', 'Hides a secret'),
  (2, 'Handler',   'Any', '20s', 'Wrangles dogs'),
  (99,'Ghost',     'Any', 'Any', 'Belongs to no show');

INSERT INTO role_application (performer_id, show_id, role_id, status, applied_at) VALUES
  (2, 1, 1, 'Pending',  '2026-01-02 03:04:05'),
  (2, 1, 1, 'Approved', '2026-01-03 03:04:05'),
  (2, 1, 2, 'Rejected', '2026-01-04 03:04:05'),
  (4, 1, 1, 'Pending',  '2026-01-05 03:04:05');

INSERT INTO show_date (show_id, date, status, location, customer, attendees, director_id, tech_date, tech_location, required_rehearsals) VALUES
  (1, '2026-06-14 19:30:00', 'Open',       'Austin', 'Acme Corp', 60, 1, '2026-06-13 18:00:00', 'Studio', 3),
  (1, '2026-01-10 19:30:00', 'Fully Cast', 'Dallas', 'Winter Co', 40, 1, NULL, NULL, 2),
  (2, '2026-09-01 14:00:00', 'Nonsense',   'Houston', NULL, NULL, 99, NULL, NULL, 4);

INSERT INTO rehearsal (show_date_id, date, location, notes) VALUES
  (1, '2026-06-01 19:00:00', 'Studio A', 'Read through'),
  (1, '2026-06-08 19:00:00', 'Studio A', NULL);

INSERT INTO show_date_interest (show_date_id, role_id, performer_id, questions, conflict_tech, conflict_rehearsal_ids) VALUES
  (1, 1, 2, 'Can I arrive late?', TRUE, '[1, 999]'),
  (1, 2, 2, NULL, FALSE, NULL);

INSERT INTO show_date_assignment (show_date_id, role_id, performer_id, status) VALUES
  (1, 1, 2, 'Confirmed'),
  (1, 2, 1, 'Offered');

INSERT INTO rehearsal_availability (rehearsal_id, performer_id, status, note) VALUES
  (1, 2, 'Unavailable', 'Out of town'),
  (2, 2, 'Partial', 'Arriving late');

INSERT INTO booking (name, email, phone, show_id, preferred_date, guest_count, message, status, created_at) VALUES
  ('Ida Wells', 'ida@example.test', '5125550100', 1, '2026-07-04', 25, 'Fourth of July party', 'Pending', '2026-02-01 12:00:00'),
  ('Ron Ford',  'ron@example.test', '5125550101', 4, '2026-08-09', 10, NULL, 'Confirmed', '2026-02-02 12:00:00');
`;

const SCRIPT_FILES = [
  "Murder for Real_v4.pdf",
  "Dog Show Debacle_v8.pdf",
  "Spies in Disguise_v3.pdf",
];

const ARGS: Args = { dryRun: false, scriptsDir: null, showStatus: "PUBLISHED" };

async function main() {
  process.env.APP_TIMEZONE = "America/Chicago";

  console.log("Starting two throwaway databases...");
  const [sourceDb, targetDb] = await Promise.all([
    startEphemeralPostgres({ migrate: false }),
    startEphemeralPostgres(),
  ]);

  const source = new Client({ connectionString: sourceDb.url });
  const db = new PrismaClient({ datasourceUrl: targetDb.url });

  try {
    await source.connect();
    await source.query(FLASK_SCHEMA);
    await source.query(FLASK_FIXTURES);

    const data = await readFlask(source);

    console.log("\nReading the Flask database:");
    await check("finds every user, including the duplicate", () =>
      assert.equal(data.users.length, 4),
    );
    await check("keeps naive timestamps as text so the driver cannot shift them", () =>
      assert.equal(typeof data.showDates[0].date, "string"),
    );

    const result = await transfer(db, data, ARGS, SCRIPT_FILES);

    console.log("\nPeople:");
    await check("migrates three distinct performers and drops the duplicate", () => {
      assert.equal(result.counts.users.created, 3);
      assert.equal(result.counts.users.skipped, 1);
    });
    await check("an administrator stays an administrator", async () => {
      const ada = await db.user.findUniqueOrThrow({ where: { email: "ada@example.test" } });
      assert.equal(ada.role, "ADMIN");
      assert.equal(ada.displayName, "Ada Byron");
    });
    await check("everyone else becomes a performer", async () => {
      const grace = await db.user.findUniqueOrThrow({ where: { email: "grace@example.test" } });
      assert.equal(grace.role, "PERFORMER");
      assert.equal(grace.bio, "Performer");
    });
    await check("addresses are matched without regard to case", async () =>
      assert.equal(await db.user.count({ where: { email: "alan@example.test" } }), 1),
    );
    await check("a headshot still to be uploaded is reported", () =>
      assert.ok(result.notes.some((note) => note.includes("Headshot for ada@example.test"))),
    );

    console.log("\nCatalog:");
    await check("every show arrives with a unique address", async () => {
      const shows = await db.show.findMany({ orderBy: { displayOrder: "asc" } });
      assert.deepEqual(
        shows.map((show) => show.slug),
        [
          // Already present: the online mysteries the migrations seed. Flask's
          // "Dog Show Debacle" merges into its existing entry rather than
          // adding a second one.
          "missing-millions",
          "dog-show-debacle",
          "holiday-inheritance",
          // Added from Flask.
          "murder-for-real",
          "the-vanishing",
          "odd-one-out",
        ],
      );
    });
    await check("delivery type is translated", async () => {
      const online = await db.show.findFirstOrThrow({ where: { title: "The Vanishing" } });
      assert.equal(online.type, "ONLINE");
      const live = await db.show.findFirstOrThrow({ where: { title: "Murder for Real" } });
      assert.equal(live.type, "STANDARD");
    });
    await check("a new online show gets its playback configuration", async () => {
      const online = await db.show.findFirstOrThrow({
        where: { title: "The Vanishing" },
        include: { online: true },
      });
      assert.ok(online.online, "expected an OnlineShowDetail row");
    });
    await check("a title held by a prerecorded mystery stays prerecorded", async () => {
      const shows = await db.show.findMany({ where: { title: "Dog Show Debacle" } });
      assert.equal(shows.length, 1, "expected one entry, not a live duplicate");
      assert.equal(shows[0].type, "ONLINE");
    });
    await check("so it is never offered as a live booking", async () => {
      const bookable = await db.show.findMany({
        where: { type: { in: ["STANDARD", "ESCAPE"] } },
        select: { title: true },
      });
      assert.ok(!bookable.some((show) => show.title === "Dog Show Debacle"));
    });
    await check("its live details are merged in rather than discarded", async () => {
      const dogs = await db.show.findFirstOrThrow({
        where: { title: "Dog Show Debacle" },
        include: { roles: true },
      });
      assert.equal(dogs.kidFriendly, true);
      assert.deepEqual(
        dogs.roles.map((role) => role.name),
        ["Handler"],
      );
    });
    await check("the reclassification is reported", () =>
      assert.ok(
        result.notes.some(
          (note) => note.includes("Dog Show Debacle") && note.includes("not offered for live booking"),
        ),
      ),
    );
    await check("an unfamiliar type is filed as standard and reported", async () => {
      const odd = await db.show.findFirstOrThrow({ where: { title: "Odd One Out" } });
      assert.equal(odd.type, "STANDARD");
      assert.ok(result.notes.some((note) => note.includes("Dinner Theatre")));
    });
    await check("scripts are matched despite the stored name being wrong", () => {
      const matched = new Map(
        result.scriptMatches.map(({ title, match }) => [title, match?.filename ?? null]),
      );
      assert.equal(matched.get("Murder for Real"), "Murder for Real_v4.pdf");
      assert.equal(matched.get("Dog Show Debacle"), "Dog Show Debacle_v8.pdf");
      assert.equal(matched.get("The Vanishing"), null);
    });

    console.log("\nRoles:");
    await check("roles are numbered within their own show", async () => {
      const roles = await db.role.findMany({
        where: { show: { title: "Murder for Real" } },
        orderBy: { displayOrder: "asc" },
      });
      assert.deepEqual(
        roles.map((role) => role.name),
        ["Detective", "Suspect"],
      );
      assert.deepEqual(
        roles.map((role) => role.displayOrder),
        [1, 2],
      );
    });
    await check("a role attached to no show is left behind", () => {
      assert.equal(result.counts.roles.skipped, 1);
      assert.ok(result.notes.some((note) => note.includes("Ghost")));
    });

    console.log("\nPerformance times, the part most easily got wrong:");
    await check("a summer evening show keeps its 7:30pm Central start", async () => {
      const summer = await db.showDate.findFirstOrThrow({ where: { customer: "Acme Corp" } });
      assert.equal(summer.date.toISOString(), "2026-06-15T00:30:00.000Z");
    });
    await check("a winter evening show keeps its 7:30pm Central start", async () => {
      const winter = await db.showDate.findFirstOrThrow({ where: { customer: "Winter Co" } });
      assert.equal(winter.date.toISOString(), "2026-01-11T01:30:00.000Z");
    });
    await check("the tech rehearsal moves with it", async () => {
      const summer = await db.showDate.findFirstOrThrow({ where: { customer: "Acme Corp" } });
      assert.equal(summer.techDate?.toISOString(), "2026-06-13T23:00:00.000Z");
    });
    await check("rehearsal times are read the same way", async () => {
      const rehearsals = await db.rehearsal.findMany({ orderBy: { date: "asc" } });
      assert.equal(rehearsals[0].date.toISOString(), "2026-06-02T00:00:00.000Z");
    });
    await check("a timestamp Postgres generated is already UTC", async () => {
      const enquiry = await db.booking.findFirstOrThrow({ where: { email: "ida@example.test" } });
      assert.equal(enquiry.createdAt.toISOString(), "2026-02-01T12:00:00.000Z");
    });
    await check("a preferred date stays on the day the customer asked for", async () => {
      const enquiry = await db.booking.findFirstOrThrow({ where: { email: "ida@example.test" } });
      assert.equal(enquiry.preferredDate.toISOString().slice(0, 10), "2026-07-04");
    });

    console.log("\nPerformance details:");
    await check("status wording becomes the enumerated value", async () => {
      const summer = await db.showDate.findFirstOrThrow({ where: { customer: "Acme Corp" } });
      assert.equal(summer.status, "OPEN");
      const winter = await db.showDate.findFirstOrThrow({ where: { customer: "Winter Co" } });
      assert.equal(winter.status, "FULLY_CAST");
    });
    await check("an unrecognized status becomes a draft and is reported", async () => {
      const odd = await db.showDate.findFirstOrThrow({ where: { location: "Houston" } });
      assert.equal(odd.status, "DRAFT");
      assert.ok(result.notes.some((note) => note.includes("Nonsense")));
    });
    await check("the director is carried across", async () => {
      const summer = await db.showDate.findFirstOrThrow({
        where: { customer: "Acme Corp" },
        include: { director: true },
      });
      assert.equal(summer.director?.email, "ada@example.test");
    });
    await check("a director who no longer exists is left unassigned", async () => {
      const odd = await db.showDate.findFirstOrThrow({ where: { location: "Houston" } });
      assert.equal(odd.directorId, null);
      assert.ok(result.notes.some((note) => note.includes("missing director")));
    });

    console.log("\nRoster requests:");
    await check("one standing request per performer and role", async () =>
      assert.equal(await db.roleApplication.count(), 3),
    );
    await check("a decision beats a pending duplicate", async () => {
      const request = await db.roleApplication.findFirstOrThrow({
        where: { performer: { email: "grace@example.test" }, role: { name: "Detective" } },
      });
      assert.equal(request.status, "APPROVED");
    });
    await check("the duplicate is reported rather than silently dropped", () =>
      assert.ok(result.notes.some((note) => note.includes("more than once"))),
    );
    await check("a request from the skipped duplicate account still lands", async () => {
      const alan = await db.user.findUniqueOrThrow({
        where: { email: "alan@example.test" },
        include: { roleApplications: true },
      });
      assert.equal(alan.roleApplications.length, 1);
    });

    console.log("\nCasting:");
    await check("interest keeps its questions and tech conflict", async () => {
      const interest = await db.showDateInterest.findFirstOrThrow({
        where: { role: { name: "Detective" }, performer: { email: "grace@example.test" } },
      });
      assert.equal(interest.questions, "Can I arrive late?");
      assert.equal(interest.conflictTech, true);
    });
    await check("a rehearsal conflict is remapped to the new rehearsal", async () => {
      const interest = await db.showDateInterest.findFirstOrThrow({
        where: { role: { name: "Detective" }, performer: { email: "grace@example.test" } },
      });
      const first = await db.rehearsal.findFirstOrThrow({ orderBy: { date: "asc" } });
      assert.deepEqual(interest.conflictRehearsalIds, [first.id]);
    });
    await check("a conflict for a rehearsal that never existed is dropped and reported", () =>
      assert.ok(result.notes.some((note) => note.includes("no longer exists"))),
    );
    await check("cast seats keep who holds them and whether they accepted", async () => {
      const confirmed = await db.showDateAssignment.findFirstOrThrow({
        where: { role: { name: "Detective" } },
        include: { performer: true },
      });
      assert.equal(confirmed.status, "CONFIRMED");
      assert.equal(confirmed.performer.email, "grace@example.test");
      const offered = await db.showDateAssignment.findFirstOrThrow({
        where: { role: { name: "Suspect" } },
      });
      assert.equal(offered.status, "OFFERED");
    });
    await check("rehearsal availability is translated", async () => {
      const rows = await db.rehearsalAvailability.findMany({
        include: { rehearsal: true },
        orderBy: { rehearsal: { date: "asc" } },
      });
      assert.deepEqual(
        rows.map((row) => row.status),
        ["UNAVAILABLE", "PARTIAL"],
      );
      assert.equal(rows[0].note, "Out of town");
    });

    console.log("\nBooking enquiries:");
    await check("enquiries arrive with their status", async () => {
      assert.equal(await db.booking.count(), 2);
      const confirmed = await db.booking.findFirstOrThrow({ where: { email: "ron@example.test" } });
      assert.equal(confirmed.status, "CONFIRMED");
    });

    console.log("\nRunning it twice changes nothing:");
    const again = await transfer(db, data, ARGS, SCRIPT_FILES);
    await check("a second run creates no rows", () => {
      const created = Object.entries(again.counts)
        .filter(([, tally]) => tally.created > 0)
        .map(([table, tally]) => `${table}=${tally.created}`);
      assert.deepEqual(created, []);
    });
    await check("row totals are unchanged", async () => {
      assert.equal(await db.user.count(), 3);
      assert.equal(await db.show.count(), 6);
      assert.equal(await db.showDate.count(), 3);
      assert.equal(await db.roleApplication.count(), 3);
      assert.equal(await db.rehearsal.count(), 2);
      assert.equal(await db.booking.count(), 2);
    });

    console.log("\nA dry run saves nothing:");
    const beforeTitle = "Dry Run Only";
    await source.query(
      `INSERT INTO show (title, description, type, kid_friendly) VALUES ('${beforeTitle}', 'x', 'Standard', FALSE)`,
    );
    const withExtra = await readFlask(source);
    try {
      await db.$transaction(async (tx) => {
        const outcome = await transfer(tx, withExtra, { ...ARGS, dryRun: true }, SCRIPT_FILES);
        throw new DryRunComplete(outcome);
      });
    } catch (error) {
      if (!(error instanceof DryRunComplete)) throw error;
      await check("the dry run reports the show it would add", () =>
        assert.equal(error.result.counts.shows.created, 1),
      );
    }
    await check("but the show is not actually there", async () =>
      assert.equal(await db.show.count({ where: { title: beforeTitle } }), 0),
    );

    // The command is what will actually be run on the day, so drive it rather
    // than only the functions underneath it.
    console.log("\nThe command itself:");
    const cli = await run("node", ["--import", "tsx", "scripts/migrate-flask.ts", "--dry-run"], {
      env: {
        ...process.env,
        FLASK_DATABASE_URL: sourceDb.url,
        DATABASE_URL: targetDb.url,
      },
      shell: process.platform === "win32",
    });
    await check("a dry run reports what it found", () => {
      assert.match(cli.stdout, /What is in the Flask database/);
      assert.match(cli.stdout, /What the migration would write/);
      assert.match(cli.stdout, /nothing was saved/);
    });
    await check("and shows how times were read", () =>
      assert.match(cli.stdout, /America\/Chicago wall clock/),
    );
    await check("leaving the database as it was", async () =>
      assert.equal(await db.show.count({ where: { title: beforeTitle } }), 0),
    );
  } finally {
    await source.end().catch(() => {});
    await db.$disconnect();
    await Promise.all([sourceDb.stop(), targetDb.stop()]);
  }
}

main()
  .then(() => {
    console.log("");
    if (failures.length) {
      console.error(`${failures.length} check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log("All migration checks passed.");
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
