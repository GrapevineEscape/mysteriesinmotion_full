"use client";

import { useActionState } from "react";
import { offer, withdraw } from "./actions";
import { emptyCastingBoardState } from "./board-state";

type Applicant = {
  performerId: string;
  name: string;
  conflicts: string[];
  questions: string | null;
};

export function OfferControls({
  showDateId,
  roleId,
  applicants,
}: {
  showDateId: string;
  roleId: string;
  applicants: Applicant[];
}) {
  const [state, formAction, pending] = useActionState(
    offer,
    emptyCastingBoardState,
  );

  if (!applicants.length) {
    return (
      <p className="admin-seat-empty">
        Nobody has put themselves forward for this role yet.
      </p>
    );
  }

  return (
    <form action={formAction} className="admin-seat-form">
      <input name="showDateId" type="hidden" value={showDateId} />
      <input name="roleId" type="hidden" value={roleId} />

      {state.message && (
        <p
          className={`admin-alert ${state.ok ? "" : "admin-alert-error"}`}
          role="status"
        >
          {state.message}
        </p>
      )}

      <label>
        <span className="visually-hidden">Performer to offer this role to</span>
        <select defaultValue={applicants[0]?.performerId} name="performerId">
          {applicants.map((applicant) => (
            <option key={applicant.performerId} value={applicant.performerId}>
              {applicant.name}
              {applicant.conflicts.length
                ? ` — ${applicant.conflicts.length} conflict${
                    applicant.conflicts.length === 1 ? "" : "s"
                  }`
                : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button button-small button-primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Offering…" : "Offer seat"}
      </button>
    </form>
  );
}

export function WithdrawControls({
  showDateId,
  roleId,
  confirmed,
}: {
  showDateId: string;
  roleId: string;
  confirmed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    withdraw,
    emptyCastingBoardState,
  );

  return (
    <form action={formAction} className="admin-seat-form">
      <input name="showDateId" type="hidden" value={showDateId} />
      <input name="roleId" type="hidden" value={roleId} />

      {state.message && (
        <p
          className={`admin-alert ${state.ok ? "" : "admin-alert-error"}`}
          role="status"
        >
          {state.message}
        </p>
      )}

      <button
        className="button button-small button-danger"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Removing…"
          : confirmed
            ? "Remove from cast"
            : "Withdraw offer"}
      </button>
    </form>
  );
}
