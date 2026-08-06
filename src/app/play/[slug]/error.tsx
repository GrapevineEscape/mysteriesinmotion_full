"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CaseRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Case Room failed.", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section className="submission-confirmation">
      <p className="eyebrow">The investigation was interrupted</p>
      <h1>Your case is still safe.</h1>
      <p>
        Try reconnecting now. Saved progress and unlocked evidence will be
        restored when the Case Room reopens.
      </p>
      <div className="button-row">
        <button className="button button-primary" onClick={reset} type="button">
          Reopen Case Room
        </button>
        <Link className="button button-ghost" href="/my-cases">
          Return to My Case Files
        </Link>
      </div>
      {error.digest && <small>Support reference: {error.digest}</small>}
    </section>
  );
}
