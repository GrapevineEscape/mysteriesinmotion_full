"use client";

import { useState } from "react";
import { deleteShowDate } from "../actions";

export function DeleteShowDate({
  showDateId,
  seatCount,
}: {
  showDateId: string;
  seatCount: number;
}) {
  const [confirmation, setConfirmation] = useState("");

  return (
    <form action={deleteShowDate} className="portal-form">
      <input name="showDateId" type="hidden" value={showDateId} />
      <p className="page-intro">
        Deleting removes the rehearsal schedule
        {seatCount > 0
          ? `, ${seatCount} cast ${seatCount === 1 ? "seat" : "seats"},`
          : ""}{" "}
        and every performer&rsquo;s interest in this date. Cancelling it instead
        keeps the record and tells the troupe it is off.
      </p>
      <label>
        <span>Type DELETE to confirm</span>
        <input
          name="confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          value={confirmation}
        />
      </label>
      <button
        className="button button-danger"
        disabled={confirmation !== "DELETE"}
        type="submit"
      >
        Delete this show date
      </button>
    </form>
  );
}
