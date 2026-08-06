/**
 * Exercises the casting engine against a real Postgres, because the rules that
 * matter most are enforced jointly by lib/casting.ts and the unique constraints
 * in the schema. The unit tests cover the decisions; this covers the writes.
 *
 * Brings up its own throwaway database, so it needs no setup and leaves nothing
 * behind. Set DATABASE_URL to run against an existing database instead.
 *
 * Run with: npm run verify:casting
 */
import assert from "node:assert/strict";
// @ts-expect-error -- plain JS helper, shared with the migration checks.
import { startEphemeralPostgres } from "./ephemeral-postgres.mjs";

const failures: string[] = [];

async function check(label: string, assertion: () => void | Promise<void>) {
  try {
    await assertion();
    console.log(`  ok    ${label}`);
  } catch (error) {
    console.log(`  FAIL  ${label}`);
    console.log(`        ${(error as Error).message.split("\n")[0]}`);
    failures.push(label);
  }
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  let stopDatabase: (() => Promise<void>) | null = null;

  if (!process.env.DATABASE_URL) {
    console.log("Starting a throwaway Postgres and applying migrations...");
    const database = await startEphemeralPostgres();
    process.env.DATABASE_URL = database.url;
    stopDatabase = database.stop;
  }

  // Imported after DATABASE_URL is set, because the client reads it on load.
  const { db } = await import("@/lib/db");
  const { acceptOffer, declineOffer, offerSeat, withdrawSeat } = await import(
    "@/lib/casting"
  );
  const { applyAutoClose } = await import("@/lib/show-date-lifecycle");

  try {
    const show = await db.show.create({
      data: {
        title: "Casting Fixture",
        slug: "casting-fixture",
        type: "STANDARD",
        shortDescription: "fixture",
        fullDescription: "fixture",
        roles: {
          create: [
            { name: "Lead", gender: "Any", age: "30s", description: "x", displayOrder: 0 },
            { name: "Second", gender: "Any", age: "40s", description: "y", displayOrder: 1 },
          ],
        },
      },
      include: { roles: { orderBy: { displayOrder: "asc" } } },
    });
    const [lead, second] = show.roles;

    const alice = await db.user.create({
      data: { email: "alice@example.test", role: "PERFORMER", lastName: "Alice" },
    });
    const bob = await db.user.create({
      data: { email: "bob@example.test", role: "PERFORMER", lastName: "Bob" },
    });

    const showDate = await db.showDate.create({
      data: { showId: show.id, date: daysFromNow(30), status: "OPEN" },
    });

    const statusOf = async () =>
      (await db.showDate.findUniqueOrThrow({ where: { id: showDate.id } })).status;

    console.log("\nAn offer answers interest:");
    const uninvited = await offerSeat(showDate.id, lead.id, alice.id);
    await check("an offer without interest is refused", () =>
      assert.equal(uninvited.ok, false),
    );

    await db.showDateInterest.createMany({
      data: [
        { showDateId: showDate.id, roleId: lead.id, performerId: alice.id },
        { showDateId: showDate.id, roleId: second.id, performerId: alice.id },
        { showDateId: showDate.id, roleId: lead.id, performerId: bob.id },
        { showDateId: showDate.id, roleId: second.id, performerId: bob.id },
      ],
    });

    const offered = await offerSeat(showDate.id, lead.id, alice.id);
    await check("an offer to an interested performer succeeds", () =>
      assert.equal(offered.ok, true),
    );

    console.log("\nOne seat per role, one seat per performer:");
    const taken = await offerSeat(showDate.id, lead.id, bob.id);
    await check("a second performer cannot be offered the same role", () =>
      assert.equal(taken.ok, false),
    );

    const doubleBooked = await offerSeat(showDate.id, second.id, alice.id);
    await check("a performer cannot hold two seats on one date", () =>
      assert.equal(doubleBooked.ok, false),
    );

    console.log("\nAccepting an offer:");
    const seat = await db.showDateAssignment.findFirstOrThrow({
      where: { showDateId: showDate.id, roleId: lead.id },
    });

    const wrongPerformer = await acceptOffer(seat.id, bob.id);
    await check("only the offered performer can accept", () =>
      assert.equal(wrongPerformer.ok, false),
    );

    const accepted = await acceptOffer(seat.id, alice.id);
    await check("the offered performer can accept", () =>
      assert.equal(accepted.ok, true),
    );

    const acceptedAgain = await acceptOffer(seat.id, alice.id);
    await check("a confirmed seat cannot be accepted again", () =>
      assert.equal(acceptedAgain.ok, false),
    );

    console.log("\nFully cast follows the confirmed seats:");
    await offerSeat(showDate.id, second.id, bob.id);
    const secondSeat = await db.showDateAssignment.findFirstOrThrow({
      where: { showDateId: showDate.id, roleId: second.id },
    });
    await check("an offer alone does not fill the show", async () =>
      assert.equal(await statusOf(), "OPEN"),
    );

    await acceptOffer(secondSeat.id, bob.id);
    await check("every role confirmed promotes the date to fully cast", async () =>
      assert.equal(await statusOf(), "FULLY_CAST"),
    );

    const withdrawn = await withdrawSeat(showDate.id, second.id);
    await check("withdrawing a confirmed seat succeeds", () =>
      assert.equal(withdrawn.ok, true),
    );
    await check("losing a confirmed performer reopens the date", async () =>
      assert.equal(await statusOf(), "OPEN"),
    );

    console.log("\nDeclining frees the seat:");
    await offerSeat(showDate.id, second.id, bob.id);
    const reoffered = await db.showDateAssignment.findFirstOrThrow({
      where: { showDateId: showDate.id, roleId: second.id },
    });
    const declined = await declineOffer(reoffered.id, bob.id);
    await check("a performer can decline an offer", () =>
      assert.equal(declined.ok, true),
    );
    await check("the declined seat is open again", async () =>
      assert.equal(
        await db.showDateAssignment.count({
          where: { showDateId: showDate.id, roleId: second.id },
        }),
        0,
      ),
    );

    console.log("\nPast performances close themselves:");
    await db.showDate.update({
      where: { id: showDate.id },
      data: { date: daysFromNow(-1), status: "OPEN" },
    });
    await applyAutoClose();
    await check("yesterday's open date is closed", async () =>
      assert.equal(await statusOf(), "CLOSED"),
    );
  } finally {
    await db.$disconnect();
    if (stopDatabase) await stopDatabase();
  }
}

main()
  .then(() => {
    console.log("");
    if (failures.length) {
      console.error(`${failures.length} check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log("All casting checks passed.");
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
