"use client";

import { useState } from "react";
import { saveRehearsal } from "../actions";

type Rehearsal = {
  id: string;
  date: string;
  location: string;
  notes: string;
};

export function RehearsalEditor({
  showDateId,
  rehearsal,
  defaultDate,
  defaultLocation,
}: {
  showDateId: string;
  rehearsal?: Rehearsal;
  defaultDate?: string;
  defaultLocation?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        className={`button button-small ${rehearsal ? "button-ghost" : "button-primary"}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        {rehearsal ? "Edit" : "Add a rehearsal"}
      </button>
    );
  }

  return (
    <form action={saveRehearsal} className="portal-form admin-role-form">
      <input name="showDateId" type="hidden" value={showDateId} />
      {rehearsal && <input name="rehearsalId" type="hidden" value={rehearsal.id} />}

      <div className="portal-form-row">
        <label>
          <span>When</span>
          <input
            autoFocus
            defaultValue={rehearsal?.date ?? defaultDate ?? ""}
            name="date"
            required
            type="datetime-local"
          />
        </label>
        <label>
          <span>Where</span>
          <input
            defaultValue={rehearsal?.location || defaultLocation || ""}
            name="location"
            placeholder="Defaults to the performance location"
          />
        </label>
      </div>

      <label>
        <span>Notes</span>
        <textarea defaultValue={rehearsal?.notes ?? ""} name="notes" rows={2} />
      </label>

      <div className="button-row">
        <button className="button button-small button-primary" type="submit">
          {rehearsal ? "Save rehearsal" : "Add rehearsal"}
        </button>
        <button
          className="button button-small button-ghost"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
