"use client";

import { useState } from "react";

export function SignInForm({ nextPath }: { nextPath: string | null }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [displayName, setDisplayName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(result.error ?? "Unable to send the code.");
    setStep("code");
  }

  /**
   * A name is only asked for once the server says this address has no account
   * yet, so returning members never retype theirs.
   */
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, code, next: nextPath }),
    });
    const result = (await response.json()) as {
      error?: string;
      needsName?: boolean;
      next?: string;
    };
    setBusy(false);
    if (!response.ok) {
      if (result.needsName) setNeedsName(true);
      return setError(result.error ?? "Unable to verify the code.");
    }
    // Full navigation so the browser definitely applies Set-Cookie before the
    // next page load (client-side router.push can race the session cookie).
    window.location.assign(result.next ?? "/my-cases");
  }

  return (
    <form onSubmit={step === "email" ? requestCode : verifyCode}>
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="email"
        disabled={step === "code" || busy}
        id="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="detective@example.com"
        required
        type="email"
        value={email}
      />
      {step === "code" && (
        <>
          <label htmlFor="code">Six-digit sign-in code</label>
          <input
            autoComplete="one-time-code"
            id="code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            pattern="\d{6}"
            required
            value={code}
          />
        </>
      )}
      {needsName && (
        <>
          <label htmlFor="display-name">Full name</label>
          <input
            autoComplete="name"
            autoFocus
            id="display-name"
            maxLength={100}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Alex Detective"
            required
            type="text"
            value={displayName}
          />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button className="button button-primary" disabled={busy} type="submit">
        {busy ? "Please wait…" : step === "email" ? "Email my sign-in code" : "Sign in"}
      </button>
      {step === "code" && (
        <button className="text-link" onClick={() => setStep("email")} type="button">
          Use a different email
        </button>
      )}
    </form>
  );
}
