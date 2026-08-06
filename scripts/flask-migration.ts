/**
 * Translates the Flask troupe database into the unified schema.
 *
 * The transfer is deliberately separate from the command that runs it, so it can
 * be exercised against a simulated Flask database in tests rather than only
 * against the real one, where a mistake is expensive.
 *
 * Re-running is safe. Every row is matched on a natural key (a user's email, a
 * show's title, a rehearsal's date) so an interrupted run can simply be repeated
 * rather than unpicked.
 */
import { Client, type QueryResultRow, types } from "pg";
import { type Prisma } from "@prisma/client";
import { zonedInstant, appTimeZone } from "@/lib/app-time";
import { slugify, uniqueSlug } from "@/lib/slug";
import { matchScript, type ScriptMatch } from "./flask-script-match";

/**
 * Read naive timestamps and dates as text. Left to itself the driver would
 * interpret a "timestamp without time zone" using the timezone of whichever
 * machine runs this script, which silently moves every performance.
 */
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1082, (value) => value);

export type Args = {
  dryRun: boolean;
  scriptsDir: string | null;
  showStatus: "DRAFT" | "PUBLISHED";
};

// --- Reading the Flask database ------------------------------------------------

type FlaskUser = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  is_admin: boolean | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
  headshot_path: string | null;
};

type FlaskShow = {
  id: number;
  title: string;
  description: string;
  type: string;
  kid_friendly: boolean | null;
  script_path: string | null;
  image_path: string | null;
};

type FlaskRole = {
  id: number;
  show_id: number;
  name: string;
  gender: string;
  age: string;
  description: string;
};

type FlaskApplication = {
  id: number;
  performer_id: number;
  show_id: number;
  role_id: number;
  status: string | null;
  applied_at: string | null;
};

type FlaskShowDate = {
  id: number;
  show_id: number;
  date: string;
  status: string | null;
  location: string | null;
  customer: string | null;
  attendees: number | null;
  notes: string | null;
  rehearsal_timeframe: number | null;
  required_rehearsals: number | null;
  min_performers: number | null;
  max_performers: number | null;
  director_id: number | null;
  tech_date: string | null;
  tech_location: string | null;
};

type FlaskInterest = {
  id: number;
  show_date_id: number;
  role_id: number;
  performer_id: number;
  questions: string | null;
  conflict_tech: boolean | null;
  conflict_rehearsal_ids: unknown;
  created_at: string | null;
};

type FlaskAssignment = {
  id: number;
  show_date_id: number;
  role_id: number;
  performer_id: number;
  status: string | null;
};

type FlaskRehearsal = {
  id: number;
  show_date_id: number;
  date: string;
  location: string | null;
  notes: string | null;
};

type FlaskAvailability = {
  id: number;
  rehearsal_id: number;
  performer_id: number;
  status: string | null;
  note: string | null;
};

type FlaskBooking = {
  id: number;
  name: string;
  email: string;
  phone: string;
  show_id: number;
  preferred_date: string;
  guest_count: number;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

export type FlaskData = {
  users: FlaskUser[];
  shows: FlaskShow[];
  roles: FlaskRole[];
  applications: FlaskApplication[];
  showDates: FlaskShowDate[];
  interests: FlaskInterest[];
  assignments: FlaskAssignment[];
  rehearsals: FlaskRehearsal[];
  availability: FlaskAvailability[];
  bookings: FlaskBooking[];
};

export async function readFlask(client: Client): Promise<FlaskData> {
  const all = async <T extends QueryResultRow>(sql: string) => (await client.query<T>(sql)).rows;
  return {
    users: await all<FlaskUser>(`SELECT * FROM "user" ORDER BY id`),
    shows: await all<FlaskShow>(`SELECT * FROM show ORDER BY id`),
    roles: await all<FlaskRole>(`SELECT * FROM role ORDER BY show_id, id`),
    applications: await all<FlaskApplication>(`SELECT * FROM role_application ORDER BY id`),
    showDates: await all<FlaskShowDate>(`SELECT * FROM show_date ORDER BY id`),
    interests: await all<FlaskInterest>(`SELECT * FROM show_date_interest ORDER BY id`),
    assignments: await all<FlaskAssignment>(`SELECT * FROM show_date_assignment ORDER BY id`),
    rehearsals: await all<FlaskRehearsal>(`SELECT * FROM rehearsal ORDER BY show_date_id, id`),
    availability: await all<FlaskAvailability>(`SELECT * FROM rehearsal_availability ORDER BY id`),
    bookings: await all<FlaskBooking>(`SELECT * FROM booking ORDER BY id`),
  };
}

// --- Value translation ---------------------------------------------------------

/** A time an administrator typed, which Flask stored as bare local wall time. */
function wallClockInstant(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value.trim());
  if (!match) return null;
  return zonedInstant(match[1], match[2]);
}

/** A timestamp Postgres generated itself, which is already UTC. */
function serverInstant(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const instant = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** A calendar day with no time attached. */
function dateOnly(value: string | null) {
  if (!value) return null;
  const day = value.trim().slice(0, 10);
  const instant = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function text(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapped<T extends string>(
  table: Record<string, T>,
  value: string | null | undefined,
  fallback: T,
) {
  const key = (value ?? "").trim().toLowerCase();
  return { value: table[key] ?? fallback, known: key === "" || key in table };
}

const SHOW_TYPES: Record<string, "STANDARD" | "ESCAPE" | "ONLINE"> = {
  standard: "STANDARD",
  escape: "ESCAPE",
  "escape room": "ESCAPE",
  "online mystery": "ONLINE",
  online: "ONLINE",
};

const APPLICATION_STATUS: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
};

const SHOW_DATE_STATUS: Record<
  string,
  "DRAFT" | "OPEN" | "FULLY_CAST" | "CLOSED" | "CANCELED"
> = {
  draft: "DRAFT",
  open: "OPEN",
  "fully cast": "FULLY_CAST",
  fully_cast: "FULLY_CAST",
  closed: "CLOSED",
  canceled: "CANCELED",
  cancelled: "CANCELED",
};

const ASSIGNMENT_STATUS: Record<string, "OFFERED" | "CONFIRMED"> = {
  offered: "OFFERED",
  confirmed: "CONFIRMED",
};

const AVAILABILITY_STATUS: Record<string, "AVAILABLE" | "UNAVAILABLE" | "PARTIAL"> = {
  available: "AVAILABLE",
  unavailable: "UNAVAILABLE",
  partial: "PARTIAL",
};

const BOOKING_STATUS: Record<string, "PENDING" | "CONFIRMED" | "REJECTED"> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  rejected: "REJECTED",
};

/** Flask's conflict list held rehearsal ids as JSON; tolerate text or numbers. */
function conflictIds(raw: unknown): number[] {
  const list = typeof raw === "string" ? safeJson(raw) : raw;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- The transfer --------------------------------------------------------------

type Tally = { created: number; updated: number; skipped: number };

function tally(): Tally {
  return { created: 0, updated: 0, skipped: 0 };
}

export type Result = {
  counts: Record<string, Tally>;
  notes: string[];
  scriptMatches: { title: string; match: ScriptMatch | null }[];
  sampleTimes: { label: string; stored: string; becomes: string }[];
};

export class DryRunComplete extends Error {
  constructor(readonly result: Result) {
    super("dry run complete");
  }
}

export async function transfer(
  tx: Prisma.TransactionClient,
  data: FlaskData,
  args: Args,
  scriptFiles: string[],
): Promise<Result> {
  const counts: Record<string, Tally> = {};
  const notes: string[] = [];
  const scriptMatches: Result["scriptMatches"] = [];
  const sampleTimes: Result["sampleTimes"] = [];
  const count = (table: string) => (counts[table] ??= tally());

  // Users -----------------------------------------------------------------
  const userIds = new Map<number, string>();
  const seenEmails = new Map<string, number>();
  for (const row of data.users) {
    const email = row.email.trim().toLowerCase();
    if (!email) {
      count("users").skipped += 1;
      notes.push(`User ${row.id} has no email address and cannot sign in; skipped.`);
      continue;
    }
    const duplicateOf = seenEmails.get(email);
    if (duplicateOf) {
      // Point the discarded account at the surviving one, or everything hanging
      // off it — roster requests, cast seats, availability — would vanish with it.
      userIds.set(row.id, userIds.get(duplicateOf)!);
      count("users").skipped += 1;
      notes.push(
        `Users ${duplicateOf} and ${row.id} share the address ${email}; kept the first and attached the second one's records to it.`,
      );
      continue;
    }
    seenEmails.set(email, row.id);

    const first = text(row.first_name);
    const last = text(row.last_name);
    const displayName = [first, last].filter(Boolean).join(" ") || null;
    const flaskRole = row.is_admin ? "ADMIN" : "PERFORMER";

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      // Never demote an account that is already an administrator here, and never
      // blank a field the unified app has since filled in.
      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          role: existing.role === "ADMIN" ? "ADMIN" : flaskRole,
          displayName: existing.displayName ?? displayName,
          firstName: existing.firstName ?? first,
          lastName: existing.lastName ?? last,
          phone: existing.phone ?? text(row.phone),
          address: existing.address ?? text(row.address),
          bio: existing.bio ?? text(row.bio),
        },
      });
      userIds.set(row.id, updated.id);
      count("users").updated += 1;
    } else {
      const created = await tx.user.create({
        data: {
          email,
          role: flaskRole,
          displayName,
          firstName: first,
          lastName: last,
          phone: text(row.phone),
          address: text(row.address),
          bio: text(row.bio),
        },
      });
      userIds.set(row.id, created.id);
      count("users").created += 1;
    }
    if (text(row.headshot_path)) {
      notes.push(
        `Headshot for ${email} still points at ${row.headshot_path}; run the asset upload to move it.`,
      );
    }
  }

  // Shows -----------------------------------------------------------------
  const showIds = new Map<number, string>();
  const takenSlugs = new Set((await tx.show.findMany({ select: { slug: true } })).map((s) => s.slug));
  const lastOrder =
    (await tx.show.aggregate({ _max: { displayOrder: true } }))._max.displayOrder ?? 0;
  for (const [index, row] of data.shows.entries()) {
    const title = text(row.title) ?? `Untitled show ${row.id}`;
    const type = mapped(SHOW_TYPES, row.type, "STANDARD");
    if (!type.known) {
      notes.push(`Show ${row.id} has an unfamiliar type ${JSON.stringify(row.type)}; filed as Standard.`);
    }

    // Which PDF belongs to this show is reported but not stored: scriptUrl holds
    // an R2 reference, which only exists once the asset upload has run. This tells
    // you in advance whether every show has a script to upload.
    const match = matchScript({ title, scriptPath: row.script_path }, scriptFiles);
    scriptMatches.push({ title, match });
    if (!match && text(row.script_path)) {
      notes.push(`No script file found on disk for "${title}" (database says ${row.script_path}).`);
    }

    const description = text(row.description) ?? "";

    // A show is matched only against one of its own kind. The same story can
    // exist twice in the catalog, once as a live production and once as a
    // prerecorded mystery, and merging those would retype the online show and
    // orphan its playback configuration.
    const online = type.value === "ONLINE";
    const existing = await tx.show.findFirst({
      where: { title, type: online ? "ONLINE" : { not: "ONLINE" } },
    });

    if (existing) {
      const updated = await tx.show.update({
        where: { id: existing.id },
        data: {
          kidFriendly: row.kid_friendly ?? false,
          fullDescription: existing.fullDescription || description,
          shortDescription: existing.shortDescription || description,
        },
      });
      showIds.set(row.id, updated.id);
      count("shows").updated += 1;
      continue;
    }

    const counterpart = await tx.show.findFirst({ where: { title } });
    if (counterpart) {
      notes.push(
        `"${title}" already exists as ${counterpart.type === "ONLINE" ? "an online mystery" : "a live production"}, and Flask lists it as ${online ? "an online mystery" : "a live production"}. Both were kept as separate catalog entries; merge them by hand if they are the same offering.`,
      );
    }

    const slug = uniqueSlug(slugify(title), takenSlugs);
    takenSlugs.add(slug);
    const created = await tx.show.create({
      data: {
        title,
        slug,
        type: type.value,
        shortDescription: description,
        fullDescription: description,
        kidFriendly: row.kid_friendly ?? false,
        status: args.showStatus,
        displayOrder: lastOrder + index + 1,
        // An online show without its configuration row would break the online
        // administration pages, which expect one to exist.
        ...(online ? { online: { create: {} } } : {}),
      },
    });
    showIds.set(row.id, created.id);
    count("shows").created += 1;
  }

  // Roles -----------------------------------------------------------------
  const roleIds = new Map<number, string>();
  const roleOrder = new Map<number, number>();
  for (const row of data.roles) {
    const showId = showIds.get(row.show_id);
    if (!showId) {
      count("roles").skipped += 1;
      notes.push(`Role ${row.id} (${row.name}) belongs to missing show ${row.show_id}; skipped.`);
      continue;
    }
    const order = (roleOrder.get(row.show_id) ?? 0) + 1;
    roleOrder.set(row.show_id, order);

    const name = text(row.name) ?? `Role ${row.id}`;
    const existing = await tx.role.findFirst({ where: { showId, name } });
    const fields = {
      gender: text(row.gender) ?? "Any",
      age: text(row.age) ?? "Any",
      description: text(row.description) ?? "",
      displayOrder: order,
    };
    if (existing) {
      await tx.role.update({ where: { id: existing.id }, data: fields });
      roleIds.set(row.id, existing.id);
      count("roles").updated += 1;
    } else {
      const created = await tx.role.create({ data: { showId, name, ...fields } });
      roleIds.set(row.id, created.id);
      count("roles").created += 1;
    }
  }

  // Show dates ------------------------------------------------------------
  const showDateIds = new Map<number, string>();
  for (const row of data.showDates) {
    const showId = showIds.get(row.show_id);
    const date = wallClockInstant(row.date);
    if (!showId || !date) {
      count("showDates").skipped += 1;
      notes.push(
        `Performance ${row.id} skipped: ${!showId ? `show ${row.show_id} is missing` : `date ${row.date} is unreadable`}.`,
      );
      continue;
    }
    if (sampleTimes.length < 5) {
      sampleTimes.push({
        label: `Performance ${row.id}`,
        stored: row.date,
        becomes: date.toISOString(),
      });
    }

    const status = mapped(SHOW_DATE_STATUS, row.status, "DRAFT");
    if (!status.known) {
      notes.push(`Performance ${row.id} has status ${JSON.stringify(row.status)}; filed as Draft.`);
    }
    const directorId = row.director_id ? (userIds.get(row.director_id) ?? null) : null;
    if (row.director_id && !directorId) {
      notes.push(`Performance ${row.id} references missing director ${row.director_id}; left unassigned.`);
    }

    const fields = {
      status: status.value,
      location: text(row.location),
      customer: text(row.customer),
      attendees: row.attendees ?? null,
      notes: text(row.notes),
      rehearsalTimeframe: row.rehearsal_timeframe ?? 14,
      requiredRehearsals: row.required_rehearsals ?? 4,
      minPerformers: row.min_performers ?? null,
      maxPerformers: row.max_performers ?? null,
      techDate: wallClockInstant(row.tech_date),
      techLocation: text(row.tech_location),
      directorId,
    };

    const existing = await tx.showDate.findFirst({ where: { showId, date } });
    if (existing) {
      await tx.showDate.update({ where: { id: existing.id }, data: fields });
      showDateIds.set(row.id, existing.id);
      count("showDates").updated += 1;
    } else {
      const created = await tx.showDate.create({ data: { showId, date, ...fields } });
      showDateIds.set(row.id, created.id);
      count("showDates").created += 1;
    }
  }

  // Rehearsals ------------------------------------------------------------
  const rehearsalIds = new Map<number, string>();
  for (const row of data.rehearsals) {
    const showDateId = showDateIds.get(row.show_date_id);
    const date = wallClockInstant(row.date);
    if (!showDateId || !date) {
      count("rehearsals").skipped += 1;
      notes.push(`Rehearsal ${row.id} skipped: its performance or date could not be resolved.`);
      continue;
    }
    const fields = { location: text(row.location) ?? "", notes: text(row.notes) };
    const existing = await tx.rehearsal.findFirst({ where: { showDateId, date } });
    if (existing) {
      await tx.rehearsal.update({ where: { id: existing.id }, data: fields });
      rehearsalIds.set(row.id, existing.id);
      count("rehearsals").updated += 1;
    } else {
      const created = await tx.rehearsal.create({ data: { showDateId, date, ...fields } });
      rehearsalIds.set(row.id, created.id);
      count("rehearsals").created += 1;
    }
  }

  // Roster requests -------------------------------------------------------
  // Flask allowed a performer to apply for one role repeatedly; the unified
  // schema holds one standing request per performer and role, so a decided
  // request wins over a pending one and the newest wins among equals.
  const rank = { REJECTED: 1, PENDING: 2, APPROVED: 3 } as const;
  const bestApplication = new Map<string, { row: FlaskApplication; status: keyof typeof rank }>();
  for (const row of data.applications) {
    const performerId = userIds.get(row.performer_id);
    const roleId = roleIds.get(row.role_id);
    if (!performerId || !roleId) {
      count("applications").skipped += 1;
      notes.push(`Roster request ${row.id} skipped: its performer or role is missing.`);
      continue;
    }
    const status = mapped(APPLICATION_STATUS, row.status, "PENDING");
    if (!status.known) {
      notes.push(`Roster request ${row.id} has status ${JSON.stringify(row.status)}; filed as Pending.`);
    }
    const key = `${performerId}:${roleId}`;
    const previous = bestApplication.get(key);
    if (!previous) {
      bestApplication.set(key, { row, status: status.value });
      continue;
    }
    count("applications").skipped += 1;
    const better =
      rank[status.value] > rank[previous.status] ||
      (rank[status.value] === rank[previous.status] && row.id > previous.row.id);
    if (better) bestApplication.set(key, { row, status: status.value });
    notes.push(
      `Performer ${row.performer_id} applied for role ${row.role_id} more than once; kept the ${better ? "newer" : "existing"} record.`,
    );
  }

  for (const { row, status } of bestApplication.values()) {
    const performerId = userIds.get(row.performer_id)!;
    const roleId = roleIds.get(row.role_id)!;
    const showId = showIds.get(row.show_id) ?? (await tx.role.findUnique({ where: { id: roleId }, select: { showId: true } }))!.showId;
    const appliedAt = serverInstant(row.applied_at) ?? new Date();
    const existing = await tx.roleApplication.findUnique({
      where: { performerId_roleId: { performerId, roleId } },
    });
    if (existing) {
      await tx.roleApplication.update({ where: { id: existing.id }, data: { status, showId } });
      count("applications").updated += 1;
    } else {
      await tx.roleApplication.create({
        data: { performerId, roleId, showId, status, appliedAt },
      });
      count("applications").created += 1;
    }
  }

  // Per-performance interest ---------------------------------------------
  for (const row of data.interests) {
    const showDateId = showDateIds.get(row.show_date_id);
    const roleId = roleIds.get(row.role_id);
    const performerId = userIds.get(row.performer_id);
    if (!showDateId || !roleId || !performerId) {
      count("interest").skipped += 1;
      notes.push(`Casting interest ${row.id} skipped: performance, role, or performer is missing.`);
      continue;
    }
    const conflicts = conflictIds(row.conflict_rehearsal_ids);
    const mappedConflicts = conflicts
      .map((old) => rehearsalIds.get(old))
      .filter((id): id is string => Boolean(id));
    if (mappedConflicts.length !== conflicts.length) {
      notes.push(
        `Casting interest ${row.id} listed a conflict for a rehearsal that no longer exists; that entry was dropped.`,
      );
    }
    const fields = {
      questions: text(row.questions),
      conflictTech: row.conflict_tech ?? false,
      conflictRehearsalIds: mappedConflicts,
    };
    const existing = await tx.showDateInterest.findUnique({
      where: { showDateId_roleId_performerId: { showDateId, roleId, performerId } },
    });
    if (existing) {
      await tx.showDateInterest.update({ where: { id: existing.id }, data: fields });
      count("interest").updated += 1;
    } else {
      await tx.showDateInterest.create({
        data: { showDateId, roleId, performerId, ...fields },
      });
      count("interest").created += 1;
    }
  }

  // Cast seats ------------------------------------------------------------
  for (const row of data.assignments) {
    const showDateId = showDateIds.get(row.show_date_id);
    const roleId = roleIds.get(row.role_id);
    const performerId = userIds.get(row.performer_id);
    if (!showDateId || !roleId || !performerId) {
      count("assignments").skipped += 1;
      notes.push(`Cast seat ${row.id} skipped: performance, role, or performer is missing.`);
      continue;
    }
    const status = mapped(ASSIGNMENT_STATUS, row.status, "OFFERED");
    if (!status.known) {
      notes.push(`Cast seat ${row.id} has status ${JSON.stringify(row.status)}; filed as Offered.`);
    }
    const existing = await tx.showDateAssignment.findUnique({
      where: { showDateId_roleId: { showDateId, roleId } },
    });
    if (existing) {
      await tx.showDateAssignment.update({
        where: { id: existing.id },
        data: { performerId, status: status.value },
      });
      count("assignments").updated += 1;
    } else {
      await tx.showDateAssignment.create({
        data: { showDateId, roleId, performerId, status: status.value },
      });
      count("assignments").created += 1;
    }
  }

  // Rehearsal availability ------------------------------------------------
  for (const row of data.availability) {
    const rehearsalId = rehearsalIds.get(row.rehearsal_id);
    const performerId = userIds.get(row.performer_id);
    if (!rehearsalId || !performerId) {
      count("availability").skipped += 1;
      continue;
    }
    const status = mapped(AVAILABILITY_STATUS, row.status, "AVAILABLE");
    const fields = { status: status.value, note: text(row.note) };
    const existing = await tx.rehearsalAvailability.findUnique({
      where: { rehearsalId_performerId: { rehearsalId, performerId } },
    });
    if (existing) {
      await tx.rehearsalAvailability.update({ where: { id: existing.id }, data: fields });
      count("availability").updated += 1;
    } else {
      await tx.rehearsalAvailability.create({ data: { rehearsalId, performerId, ...fields } });
      count("availability").created += 1;
    }
  }

  // Booking enquiries -----------------------------------------------------
  for (const row of data.bookings) {
    const showId = showIds.get(row.show_id);
    const preferredDate = dateOnly(row.preferred_date);
    if (!showId || !preferredDate) {
      count("bookings").skipped += 1;
      notes.push(`Enquiry ${row.id} skipped: its show or preferred date could not be resolved.`);
      continue;
    }
    const email = row.email.trim().toLowerCase();
    const status = mapped(BOOKING_STATUS, row.status, "PENDING");
    const existing = await tx.booking.findFirst({ where: { email, showId, preferredDate } });
    if (existing) {
      await tx.booking.update({
        where: { id: existing.id },
        data: { status: status.value, guestCount: row.guest_count, message: text(row.message) },
      });
      count("bookings").updated += 1;
    } else {
      await tx.booking.create({
        data: {
          name: text(row.name) ?? "Unknown",
          email,
          phone: text(row.phone) ?? "",
          showId,
          preferredDate,
          guestCount: row.guest_count ?? 1,
          message: text(row.message),
          status: status.value,
          createdAt: serverInstant(row.created_at) ?? new Date(),
        },
      });
      count("bookings").created += 1;
    }
  }

  return { counts, notes, scriptMatches, sampleTimes };
}

// --- Reporting -----------------------------------------------------------------

export function report(data: FlaskData, result: Result, args: Args) {
  console.log(`\n=== What is in the Flask database ===`);
  console.table(
    Object.entries({
      users: data.users.length,
      shows: data.shows.length,
      roles: data.roles.length,
      rosterRequests: data.applications.length,
      performances: data.showDates.length,
      castingInterest: data.interests.length,
      castSeats: data.assignments.length,
      rehearsals: data.rehearsals.length,
      rehearsalAvailability: data.availability.length,
      bookingEnquiries: data.bookings.length,
    }).map(([table, rows]) => ({ table, rows })),
  );

  console.log(`=== ${args.dryRun ? "What the migration would write" : "What the migration wrote"} ===`);
  console.table(
    Object.entries(result.counts).map(([table, t]) => ({
      table,
      created: t.created,
      updated: t.updated,
      skipped: t.skipped,
    })),
  );

  if (result.scriptMatches.length) {
    console.log(`=== Script files matched to shows ===`);
    console.table(
      result.scriptMatches.map(({ title, match }) => ({
        show: title,
        script: match?.filename ?? "— none found —",
        matchedBy: match?.how ?? "—",
      })),
    );
  }

  if (result.sampleTimes.length) {
    console.log(`=== Times read as ${appTimeZone()} wall clock ===`);
    console.table(result.sampleTimes);
  }

  if (result.notes.length) {
    console.log(`=== Things worth your attention (${result.notes.length}) ===`);
    for (const note of result.notes) console.log(`  - ${note}`);
  } else {
    console.log(`No anomalies found.`);
  }
}
