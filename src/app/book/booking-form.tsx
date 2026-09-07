"use client";

import { useActionState, useState } from "react";
import { BROADCAST_FACTS } from "@/lib/broadcast-facts";
import { requestBooking } from "./actions";
import { emptyBookingState } from "./booking-state";

type ShowOption = { id: string; title: string; slug: string };
type BookingFormatChoice = "live" | "broadcast";

export function BookingForm({
  shows,
  defaultShowId = "",
  defaultFormat = "live",
}: {
  shows: ShowOption[];
  defaultShowId?: string;
  defaultFormat?: BookingFormatChoice;
}) {
  const [state, formAction, pending] = useActionState(
    requestBooking,
    emptyBookingState,
  );
  const [format, setFormat] = useState<BookingFormatChoice>(defaultFormat);
  const today = new Date().toISOString().split("T")[0];
  const isBroadcast = format === "broadcast";

  if (state.status === "success") {
    return (
      <div className="admin-alert" role="status">
        <strong>Request received</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="booking-form">
      <div className="booking-form-intro">
        <h2>Request booking information</h2>
        <p>
          Tell us about your event. We will follow up within two business days
          to confirm availability and talk through shows and rates.
        </p>
      </div>

      {state.status === "error" && (
        <p className="admin-alert admin-alert-error" role="alert">
          {state.message}
        </p>
      )}

      <fieldset className="booking-field booking-format">
        <legend>How should we perform?</legend>
        <label>
          <input
            checked={format === "live"}
            name="format"
            onChange={() => setFormat("live")}
            type="radio"
            value="live"
          />
          <span>Live at your venue (Dallas–Fort Worth)</span>
        </label>
        <label>
          <input
            checked={format === "broadcast"}
            name="format"
            onChange={() => setFormat("broadcast")}
            type="radio"
            value="broadcast"
          />
          <span>
            {BROADCAST_FACTS.name} (online, anywhere, {BROADCAST_FACTS.season})
          </span>
        </label>
        {state.fieldErrors.format && (
          <small role="alert">{state.fieldErrors.format}</small>
        )}
      </fieldset>

      <label className="booking-field">
        <span>Your name</span>
        <input maxLength={100} name="name" required />
        {state.fieldErrors.name && (
          <small role="alert">{state.fieldErrors.name}</small>
        )}
      </label>

      <label className="booking-field">
        <span>Email address</span>
        <input autoComplete="email" name="email" required type="email" />
        {state.fieldErrors.email && (
          <small role="alert">{state.fieldErrors.email}</small>
        )}
      </label>

      <label className="booking-field">
        <span>Phone number</span>
        <input
          autoComplete="tel"
          name="phone"
          placeholder="(555) 555-5555"
          required
          type="tel"
        />
        {state.fieldErrors.phone && (
          <small role="alert">{state.fieldErrors.phone}</small>
        )}
      </label>

      {!isBroadcast && (
        <label className="booking-field">
          <span>Preferred show</span>
          <select defaultValue={defaultShowId} name="showId" required>
            <option disabled value="">
              Choose a show…
            </option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.title}
              </option>
            ))}
          </select>
          {state.fieldErrors.showId && (
            <small role="alert">{state.fieldErrors.showId}</small>
          )}
        </label>
      )}

      <div className="booking-field-row">
        <label className="booking-field">
          <span>Preferred date</span>
          <input min={today} name="preferredDate" required type="date" />
          {state.fieldErrors.preferredDate && (
            <small role="alert">{state.fieldErrors.preferredDate}</small>
          )}
        </label>

        <label className="booking-field">
          <span>Expected number of guests</span>
          <input min={1} name="guestCount" required type="number" />
          {state.fieldErrors.guestCount && (
            <small role="alert">{state.fieldErrors.guestCount}</small>
          )}
        </label>
      </div>

      <div className="booking-field-row">
        <label className="booking-field">
          <span>
            {isBroadcast ? "Company / city (optional)" : "Venue / city"}
          </span>
          <input
            maxLength={200}
            name="venue"
            placeholder={
              isBroadcast
                ? "e.g. Remote team, nationwide"
                : "e.g. Private home in Plano"
            }
            required={!isBroadcast}
          />
          {state.fieldErrors.venue && (
            <small role="alert">{state.fieldErrors.venue}</small>
          )}
        </label>

        <label className="booking-field">
          <span>Event type</span>
          <select defaultValue="" name="eventType" required>
            <option disabled value="">
              Choose event type…
            </option>
            <option value="Private party">Private party</option>
            <option value="Corporate">Corporate</option>
            <option value="Fundraiser">Fundraiser</option>
            <option value="Team building">Team building</option>
            <option value="Other">Other</option>
          </select>
          {state.fieldErrors.eventType && (
            <small role="alert">{state.fieldErrors.eventType}</small>
          )}
        </label>
      </div>

      <label className="booking-field">
        <span>Additional information</span>
        <textarea name="message" rows={4} />
      </label>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Sending…" : "Request booking"}
      </button>
    </form>
  );
}
