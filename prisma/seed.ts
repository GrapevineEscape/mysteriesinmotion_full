/**
 * Development seed: enough of a troupe, a catalog, and a booked performance to
 * exercise every screen in the portal and the marketing site.
 *
 * Safe to re-run; every record is upserted on a stable natural key.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, type ShowType } from "@prisma/client";

const db = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@mysteriesinmotion.com";

function daysFromNow(days: number, hour = 19, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const SHOWS: Array<{
  slug: string;
  title: string;
  type: ShowType;
  shortDescription: string;
  fullDescription: string;
  kidFriendly: boolean;
  roles: Array<{ name: string; gender: string; age: string; description: string }>;
}> = [
  {
    slug: "murder-at-the-manor",
    title: "Murder at the Manor",
    type: "STANDARD",
    shortDescription:
      "A country-house weekend goes badly wrong before the soup course.",
    fullDescription:
      "Lord Ashcombe has invited his nearest and dearest to the manor for the weekend. By the second course one of them is dead, and every guest has a reason to be glad of it. Your guests question the suspects, weigh the evidence, and name a killer before dessert.",
    kidFriendly: false,
    roles: [
      {
        name: "Lord Ashcombe",
        gender: "Male",
        age: "50s",
        description: "The host, generous with wine and stingy with the truth.",
      },
      {
        name: "Vivian Crane",
        gender: "Female",
        age: "30s",
        description: "A novelist researching a book she will never write.",
      },
      {
        name: "Inspector Bray",
        gender: "Any",
        age: "40s",
        description: "Arrives suspiciously quickly and asks the wrong questions.",
      },
      {
        name: "Mrs. Pell",
        gender: "Female",
        age: "60s",
        description: "The housekeeper, who knows where everything is buried.",
      },
    ],
  },
  {
    slug: "last-train-from-halloway",
    title: "Last Train from Halloway",
    type: "ESCAPE",
    shortDescription:
      "Eighty minutes, one carriage, and a conductor who is not what he seems.",
    fullDescription:
      "The 11:40 out of Halloway is running late and will not be stopping. Locked in a single carriage with a body in the guard's van, your guests work the clues, open the cases, and get off the train before it reaches the bridge.",
    kidFriendly: true,
    roles: [
      {
        name: "The Conductor",
        gender: "Any",
        age: "40s",
        description: "Punches tickets. Answers nothing.",
      },
      {
        name: "Dr. Halloway",
        gender: "Any",
        age: "50s",
        description: "Travelling under a name that is almost his own.",
      },
      {
        name: "Junie Marsh",
        gender: "Female",
        age: "20s",
        description: "Boarded without a ticket and will not say why.",
      },
    ],
  },
];

async function seedPeople() {
  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      role: "ADMIN",
      firstName: "Site",
      lastName: "Administrator",
      emailVerifiedAt: new Date(),
    },
  });

  const performers = await Promise.all(
    [
      { email: "rosa@example.com", firstName: "Rosa", lastName: "Alvarez" },
      { email: "dev@example.com", firstName: "Dev", lastName: "Chaudhry" },
      { email: "marnie@example.com", firstName: "Marnie", lastName: "Webb" },
    ].map((person) =>
      db.user.upsert({
        where: { email: person.email },
        update: { role: "PERFORMER" },
        create: {
          ...person,
          role: "PERFORMER",
          phone: "214-213-8719",
          bio: "Company member since the first season.",
          emailVerifiedAt: new Date(),
        },
      }),
    ),
  );

  return { admin, performers };
}

async function seedCatalog() {
  const shows = [];
  for (const [index, entry] of SHOWS.entries()) {
    const { roles, ...showFields } = entry;
    const show = await db.show.upsert({
      where: { slug: entry.slug },
      update: { ...showFields, status: "PUBLISHED", displayOrder: index },
      create: { ...showFields, status: "PUBLISHED", displayOrder: index },
    });

    for (const [order, role] of roles.entries()) {
      const existing = await db.role.findFirst({
        where: { showId: show.id, name: role.name },
      });
      if (existing) {
        await db.role.update({
          where: { id: existing.id },
          data: { ...role, displayOrder: order },
        });
      } else {
        await db.role.create({
          data: { ...role, showId: show.id, displayOrder: order },
        });
      }
    }

    shows.push(show);
  }
  return shows;
}

async function seedPerformance(
  showId: string,
  directorId: string,
  performerIds: string[],
) {
  const roles = await db.role.findMany({
    where: { showId },
    orderBy: { displayOrder: "asc" },
  });

  const date = daysFromNow(21);
  const existing = await db.showDate.findFirst({ where: { showId, date } });
  const showDate =
    existing ??
    (await db.showDate.create({
      data: {
        showId,
        date,
        status: "OPEN",
        location: "Ashcombe Hall, Dallas",
        customer: "Redgrave Anniversary Party",
        attendees: 60,
        directorId,
        techDate: daysFromNow(20, 18),
        techLocation: "Ashcombe Hall, Dallas",
      },
    }));

  if (!existing) {
    await db.rehearsal.createMany({
      data: [
        {
          showDateId: showDate.id,
          date: daysFromNow(7, 19),
          location: "Studio B",
          notes: "Read-through and blocking.",
        },
        {
          showDateId: showDate.id,
          date: daysFromNow(14, 19),
          location: "Studio B",
          notes: "Off book.",
        },
      ],
    });
  }

  // One performer has applied, another already holds an unanswered offer, so
  // both sides of the casting flow are visible straight after seeding.
  const [first, second] = performerIds;
  if (roles[0] && first) {
    await db.showDateInterest.upsert({
      where: {
        showDateId_roleId_performerId: {
          showDateId: showDate.id,
          roleId: roles[0].id,
          performerId: first,
        },
      },
      update: {},
      create: {
        showDateId: showDate.id,
        roleId: roles[0].id,
        performerId: first,
        questions: "Happy to help with props if useful.",
      },
    });
  }

  if (roles[1] && second) {
    await db.showDateInterest.upsert({
      where: {
        showDateId_roleId_performerId: {
          showDateId: showDate.id,
          roleId: roles[1].id,
          performerId: second,
        },
      },
      update: {},
      create: {
        showDateId: showDate.id,
        roleId: roles[1].id,
        performerId: second,
        conflictTech: true,
      },
    });
    await db.showDateAssignment.upsert({
      where: {
        showDateId_roleId: { showDateId: showDate.id, roleId: roles[1].id },
      },
      update: {},
      create: {
        showDateId: showDate.id,
        roleId: roles[1].id,
        performerId: second,
        status: "OFFERED",
      },
    });
  }

  return showDate;
}

async function main() {
  const { admin, performers } = await seedPeople();
  const shows = await seedCatalog();
  const showDate = await seedPerformance(
    shows[0].id,
    admin.id,
    performers.map((p) => p.id),
  );

  console.log("Seeded:");
  console.log(`  admin      ${admin.email}`);
  for (const performer of performers) console.log(`  performer  ${performer.email}`);
  for (const show of shows) console.log(`  show       ${show.slug}`);
  console.log(`  show date  ${showDate.date.toISOString()} (${showDate.status})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
