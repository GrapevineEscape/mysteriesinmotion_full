"use client";

import { useActionState, useState } from "react";
import type { ShowDateStatus } from "@prisma/client";
import { SHOW_DATE_STATUS_LABELS } from "@/lib/show-date-lifecycle";
import { updateShowDate } from "../actions";
import { emptyWizardState } from "../wizard-state";

type Option = { id: string; label: string };

type ShowDateFields = {
  id: string;
  date: string;
  location: string;
  status: ShowDateStatus;
  customer: string;
  attendees: number | null;
  notes: string;
  directorId: string | null;
  techDate: string;
  techLocation: string;
};

const STATUSES: ShowDateStatus[] = [
  "DRAFT",
  "OPEN",
  "FULLY_CAST",
  "CLOSED",
  "CANCELED",
];

export function ShowDateForm({
  showDate,
  directors,
}: {
  showDate: ShowDateFields;
  directors: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    updateShowDate,
    emptyWizardState,
  );
  const [includeTech, setIncludeTech] = useState(Boolean(showDate.techDate));

  return (
    <form action={formAction} className="portal-form">
      <input name="showDateId" type="hidden" value={showDate.id} />

      {state.errors.length > 0 && (
        <div className="admin-alert admin-alert-error" role="alert">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state.saved && (
        <p className="admin-alert" role="status">
          Show date updated.
        </p>
      )}

      <div className="portal-form-row">
        <label>
          <span>Date and time</span>
          <input
            defaultValue={showDate.date}
            name="date"
            required
            type="datetime-local"
          />
        </label>
        <label>
          <span>Status</span>
          <select defaultValue={showDate.status} name="status">
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {SHOW_DATE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <small>
            Fully Cast is set automatically once every role is confirmed.
          </small>
        </label>
      </div>

      <label>
        <span>Location</span>
        <input defaultValue={showDate.location} name="location" required />
      </label>

      <div className="portal-form-row">
        <label>
          <span>Customer</span>
          <input defaultValue={showDate.customer} name="customer" />
        </label>
        <label>
          <span>Expected guests</span>
          <input
            defaultValue={showDate.attendees ?? ""}
            min={0}
            name="attendees"
            type="number"
          />
        </label>
        <label>
          <span>Director</span>
          <select defaultValue={showDate.directorId ?? ""} name="directorId">
            <option value="">Not assigned</option>
            {directors.map((director) => (
              <option key={director.id} value={director.id}>
                {director.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Notes</span>
        <textarea defaultValue={showDate.notes} name="notes" rows={3} />
      </label>

      <fieldset className="portal-fieldset">
        <legend>Tech rehearsal</legend>
        <label className="portal-checkbox">
          <input
            checked={includeTech}
            name="includeTech"
            onChange={(event) => setIncludeTech(event.target.checked)}
            type="checkbox"
          />
          <span>Hold a tech rehearsal</span>
        </label>
        {includeTech && (
          <div className="portal-form-row">
            <label>
              <span>When</span>
              <input
                defaultValue={showDate.techDate}
                name="techDate"
                type="datetime-local"
              />
            </label>
            <label>
              <span>Where</span>
              <input
                defaultValue={showDate.techLocation}
                name="techLocation"
                placeholder="Defaults to the performance location"
              />
            </label>
          </div>
        )}
      </fieldset>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save show date"}
      </button>
    </form>
  );
}
