type Message = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Without a delivery provider there is no way to sign in, since every account
 * uses an emailed code. Outside production the message is written to the
 * server log instead so the application is usable from a fresh checkout.
 */
function logInsteadOfSending({ to, subject, html }: Message) {
  console.info(
    ["", "─".repeat(72), `Email not configured; would have sent:`, `To: ${to}`, `Subject: ${subject}`, html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), "─".repeat(72), ""].join("\n"),
  );
}

export async function sendEmail({ to, subject, html, replyTo }: Message) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email delivery is not configured.");
    }
    logInsteadOfSending({ to, subject, html, replyTo });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("Resend rejected an email", {
      subject,
      status: response.status,
      response: responseText.slice(0, 1000),
    });
    throw new Error(`Unable to deliver email (Resend ${response.status}).`);
  }
}

export async function sendLoginCode({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  await sendEmail({
    to: email,
    subject: "Your Mysteries in Motion sign-in code",
    html: `<p>Your sign-in code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}

type BookingSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: Date;
  guestCount: number;
  message: string | null;
};

const bookingDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeZone: "UTC",
});

/** Where new booking inquiries are sent. Falls back to the admin address. */
function bookingInbox() {
  const configured =
    process.env.BOOKING_NOTIFICATION_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim();
  if (!configured) {
    throw new Error("No booking notification address is configured.");
  }
  return configured.split(",").map((address) => address.trim());
}

export async function sendBookingNotification({
  booking,
  showTitle,
}: {
  booking: BookingSummary;
  showTitle: string;
}) {
  await sendEmail({
    to: bookingInbox(),
    replyTo: booking.email,
    subject: `Booking request: ${showTitle} for ${booking.name}`,
    html: `
      <h2>New booking request</h2>
      <p><strong>Show:</strong> ${showTitle}</p>
      <p><strong>Preferred date:</strong> ${bookingDate.format(booking.preferredDate)}</p>
      <p><strong>Guests:</strong> ${booking.guestCount}</p>
      <hr />
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      ${booking.message ? `<p><strong>Message:</strong><br />${booking.message}</p>` : ""}
    `,
  });
}

export async function sendBookingReceipt({
  booking,
  showTitle,
}: {
  booking: BookingSummary;
  showTitle: string;
}) {
  await sendEmail({
    to: booking.email,
    subject: "We received your Mysteries in Motion booking request",
    html: `
      <p>Thank you for your booking request, ${booking.name}.</p>
      <p>We have your inquiry for <strong>${showTitle}</strong> on
      <strong>${bookingDate.format(booking.preferredDate)}</strong> for
      ${booking.guestCount} ${booking.guestCount === 1 ? "guest" : "guests"}.</p>
      <p>This is not a confirmed booking yet. We will be in touch shortly to
      confirm availability and talk through the details.</p>
      <p>— Mysteries in Motion</p>
    `,
  });
}

export function troupeInviteOpening(role: "PERFORMER" | "ADMIN") {
  return role === "ADMIN"
    ? "You have been invited to join the Mysteries in Motion troupe portal as an Administrator."
    : "You have been invited to join the Mysteries in Motion troupe portal.";
}

function inviteShowLine(role: "PERFORMER" | "ADMIN", showTitles: string[]) {
  if (role !== "PERFORMER") return "";
  if (!showTitles.length) {
    return "<p>No shows have been assigned to you yet.</p>";
  }
  const titles = showTitles
    .map((title) =>
      title
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;"),
    )
    .join(", ");
  return `<p>You will be able to see: ${titles}.</p>`;
}

export async function sendTroupeInvite({
  email,
  signInUrl,
  expiresAt,
  role = "PERFORMER",
  showTitles = [],
}: {
  email: string;
  signInUrl: string;
  expiresAt: Date;
  role?: "PERFORMER" | "ADMIN";
  showTitles?: string[];
}) {
  const expires = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(expiresAt);

  await sendEmail({
    to: email,
    subject: "You have been invited to the Mysteries in Motion troupe",
    html: `
      <p>${troupeInviteOpening(role)}</p>
      ${inviteShowLine(role, showTitles)}
      <p>There is no password. Enter your email address on the sign-in page and
      we will send you a six-digit code.</p>
      <p><a href="${signInUrl}">${signInUrl}</a></p>
      <p>Sign in with <strong>${email}</strong> before ${expires} to claim your
      troupe access.</p>
    `,
  });
}
