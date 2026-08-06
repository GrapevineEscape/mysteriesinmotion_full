type LoginEmail = {
  email: string;
  code: string;
};

export async function sendLoginCode({ email, code }: LoginEmail) {
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
      to: [email],
      subject: "Your Mysteries in Motion sign-in code",
      html: `<p>Your sign-in code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("Resend rejected the login email", {
      status: response.status,
      response: responseText.slice(0, 1000),
    });
    throw new Error(`Unable to deliver sign-in code (Resend ${response.status}).`);
  }
}
