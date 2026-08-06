type Message = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: Message) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured.");
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

export async function sendTroupeInvite({
  email,
  signInUrl,
  expiresAt,
}: {
  email: string;
  signInUrl: string;
  expiresAt: Date;
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
      <p>You have been invited to join the Mysteries in Motion troupe portal.</p>
      <p>There is no password. Enter your email address on the sign-in page and
      we will send you a six-digit code.</p>
      <p><a href="${signInUrl}">${signInUrl}</a></p>
      <p>Sign in with <strong>${email}</strong> before ${expires} to claim your
      troupe access.</p>
    `,
  });
}
