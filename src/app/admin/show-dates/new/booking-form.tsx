"use client";

import { useActionState } from "react";
import { createShowDate } from "../actions";
import { emptyWizardState } from "../wizard-state";

type Option = { id: string; label: string };

export function BookingForm({
  shows,
  directors,
}: {
  shows: Option[];
  directors: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    createShowDate,
    emptyWizardState,
  );

  return (
    <form action={formAction} className="portal-form">
      {state.errors.length > 0 && (
        <div className="admin-alert admin-alert-error" role="alert">
          <strong>Please fix the following:</strong>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <label>
        <span>Show</span>
        <select defaultValue="" name="showId" required>
          <option disabled value="">
            Choose a show
          </option>
          {shows.map((show) => (
            <option key={show.id} value={show.id}>
              {show.label}
            </option>
          ))}
        </select>
      </label>

      <div className="portal-form-row">
        <label>
          <span>Date and time</span>
          <input name="date" required type="datetime-local" />
        </label>
        <label>
          <span>Expected guests</span>
          <input min={0} name="attendees" type="number" />
        </label>
      </div>

      <label>
        <span>Location</span>
        <input name="location" placeholder="Venue and address" required />
      </label>

      <div className="portal-form-row">
        <label>
          <span>Customer</span>
          <input name="customer" placeholder="Who booked the show" />
        </label>
        <label>
          <span>Director</span>
          <select defaultValue="" name="directorId">
            <option value="">Assign later</option>
            {directors.map((director) => (
              <option key={director.id} value={director.id}>
                {director.label}
              </option>
            ))}
          </select>
          <small>A director can run this casting board without being an admin.</small>
        </label>
      </div>

      <label>
        <span>Notes</span>
        <textarea name="notes" rows={3} />
      </label>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Continue to casting"}
      </button>
    </form>
  );
}
