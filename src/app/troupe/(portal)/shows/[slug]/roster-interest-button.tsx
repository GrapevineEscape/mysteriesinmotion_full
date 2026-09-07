"use client";

import { useFormStatus } from "react-dom";
import { addRosterInterest } from "./actions";

function SubmitButton({ roleName }: { roleName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-small button-primary"
      disabled={pending}
      onClick={(event) => {
        const confirmed = window.confirm(
          `Add standing interest in ${roleName}? This does not cast you for a specific date.`,
        );
        if (!confirmed) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? "Saving…" : "I would play this role"}
    </button>
  );
}

export function RosterInterestButton({
  roleId,
  roleName,
}: {
  roleId: string;
  roleName: string;
}) {
  return (
    <form action={addRosterInterest}>
      <input name="roleId" type="hidden" value={roleId} />
      <SubmitButton roleName={roleName} />
      <small className="muted">Does not cast you for a specific date.</small>
    </form>
  );
}
