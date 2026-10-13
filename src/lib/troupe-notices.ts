import { formatDateTime } from "@/lib/app-time";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const REPLY_TO = "info@mysteriesinmotion.com";

function siteUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "https://mysteriesinmotion.com";
}

export function escapeNoticeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function deliver(message: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await sendEmail({ ...message, replyTo: REPLY_TO });
  } catch (error) {
    console.error("Troupe notice failed", { subject: message.subject, error });
  }
}

async function performance(showDateId: string) {
  return db.showDate.findUnique({
    where: { id: showDateId },
    include: {
      show: { select: { title: true } },
      rehearsals: { orderBy: { date: "asc" }, select: { date: true, location: true } },
    },
  });
}

function whenAndWhere(showDate: {
  date: Date;
  location: string | null;
}) {
  const when = escapeNoticeText(formatDateTime(showDate.date));
  const where = escapeNoticeText(showDate.location ?? "Location to be announced");
  return { when, where };
}

/** Tell every actor who is not already confirmed that a date is open. */
export async function notifyCastingOpened(showDateId: string) {
  const showDate = await performance(showDateId);
  if (!showDate) return;

  const [performers, confirmed] = await Promise.all([
    db.user.findMany({
      where: {
        role: "PERFORMER",
        OR: [
          { showAccessRestricted: false },
          { showAccess: { some: { showId: showDate.showId } } },
        ],
      },
      select: { email: true },
    }),
    db.showDateAssignment.findMany({
      where: { showDateId, status: "CONFIRMED" },
      select: { performer: { select: { email: true } } },
    }),
  ]);

  const alreadyCast = new Set(confirmed.map((seat) => seat.performer.email));
  const recipients = performers
    .map((person) => person.email)
    .filter((email) => !alreadyCast.has(email));
  if (!recipients.length) return;

  const { when, where } = whenAndWhere(showDate);
  const title = escapeNoticeText(showDate.show.title);
  const link = `${siteUrl()}/troupe/casting/${showDate.id}`;
  const subject = `Casting is open: ${showDate.show.title}`;

  for (const to of recipients) {
    await deliver({
      to,
      subject,
      html: `
        <p>Casting is open for <strong>${title}</strong>.</p>
        <p>${when}<br />${where}</p>
        <p>Sign in and choose the roles you can play for this performance.</p>
        <p><a href="${link}">${escapeNoticeText(link)}</a></p>
      `,
    });
  }
}

/** Tell one actor they have been offered a role. */
export async function notifyRoleOffered(
  showDateId: string,
  roleId: string,
  performerId: string,
) {
  const [showDate, role, performer] = await Promise.all([
    performance(showDateId),
    db.role.findUnique({ where: { id: roleId }, select: { name: true } }),
    db.user.findUnique({ where: { id: performerId }, select: { email: true } }),
  ]);
  if (!showDate || !role || !performer) return;

  const { when, where } = whenAndWhere(showDate);
  const link = `${siteUrl()}/troupe/casting/${showDate.id}`;

  await deliver({
    to: performer.email,
    subject: `Role offer: ${role.name} in ${showDate.show.title}`,
    html: `
      <p>You have been offered <strong>${escapeNoticeText(role.name)}</strong>
      in <strong>${escapeNoticeText(showDate.show.title)}</strong>.</p>
      <p>${when}<br />${where}</p>
      <p>Accept or decline the offer in the troupe portal.</p>
      <p><a href="${link}">${escapeNoticeText(link)}</a></p>
    `,
  });
}

/** Tell one actor a seat is theirs, whether they accepted an offer or were pre-cast. */
export async function notifySeatConfirmed(
  showDateId: string,
  roleId: string,
  performerId: string,
) {
  const [showDate, role, performer] = await Promise.all([
    performance(showDateId),
    db.role.findUnique({ where: { id: roleId }, select: { name: true } }),
    db.user.findUnique({ where: { id: performerId }, select: { email: true } }),
  ]);
  if (!showDate || !role || !performer) return;

  const { when, where } = whenAndWhere(showDate);
  const rehearsals = showDate.rehearsals
    .map(
      (rehearsal) =>
        `<li>${escapeNoticeText(formatDateTime(rehearsal.date))} · ${escapeNoticeText(rehearsal.location)}</li>`,
    )
    .join("");
  const link = `${siteUrl()}/troupe/casting/${showDate.id}`;

  await deliver({
    to: performer.email,
    subject: `You are confirmed: ${role.name} in ${showDate.show.title}`,
    html: `
      <p>You are confirmed as <strong>${escapeNoticeText(role.name)}</strong>
      in <strong>${escapeNoticeText(showDate.show.title)}</strong>.</p>
      <p>${when}<br />${where}</p>
      ${rehearsals ? `<p>Rehearsals</p><ul>${rehearsals}</ul>` : ""}
      <p><a href="${link}">${escapeNoticeText(link)}</a></p>
    `,
  });
}
