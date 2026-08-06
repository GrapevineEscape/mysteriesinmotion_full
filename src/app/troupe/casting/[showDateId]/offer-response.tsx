"use client";

import { useActionState } from "react";
import { respondToOffer } from "./actions";
import { emptyOfferResponseState } from "./offer-response-state";

export function OfferResponse({
  assignmentId,
  roleName,
}: {
  assignmentId: string;
  roleName: string;
}) {
  const [state, formAction, pending] = useActionState(
    respondToOffer,
    emptyOfferResponseState,
  );

  return (
    <form action={formAction}>
      <input name="assignmentId" type="hidden" value={assignmentId} />
      {state.message && (
        <p
          className={state.ok ? "admin-alert" : "admin-alert admin-alert-error"}
          role="status"
        >
          {state.message}
        </p>
      )}
      <div className="button-row">
        <button
          className="button button-primary"
          disabled={pending}
          name="intent"
          type="submit"
          value="accept"
        >
          Accept {roleName}
        </button>
        <button
          className="button button-ghost"
          disabled={pending}
          name="intent"
          onClick={(event) => {
            if (!window.confirm(`Decline ${roleName} for this date?`)) {
              event.preventDefault();
            }
          }}
          type="submit"
          value="decline"
        >
          Decline
        </button>
      </div>
    </form>
  );
}
