"use client";

import { useActionState } from "react";
import { emptyBookingState, requestBooking } from "./actions";

type ShowOption = { id: string; title: string };

export function BookingForm({ shows }: { shows: ShowOption[] }) {
  const [state, formAction, pending] = useActionState(
    requestBooking,
    emptyBookingState,
  );
  const today = new Date().toISOString().split("T")[0];

  if (state.status === "success") {
    return (
      <div className="admin-alert" role="status">
        <strong>Request received</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-panel">
      <h2>Request booking information</h2>

      {state.status === "error" && (
        <p role="alert">{state.message}</p>
      )}

      <label>
        <span>Your name</span>
        <input maxLength={100} name="name" required />
        {state.fieldErrors.name && (
          <small role="alert">{state.fieldErrors.name}</small>
        )}
      </label>

      <label>
        <span>Email address</span>
        <input autoComplete="email" name="email" required type="email" />
        {state.fieldErrors.email && (
          <small role="alert">{state.fieldErrors.email}</small>
        )}
      </label>

      <label>
        <span>Phone number</span>
        <input
          autoComplete="tel"
          name="phone"
          placeholder="214-213-8719"
          required
          type="tel"
        />
        {state.fieldErrors.phone && (
          <small role="alert">{state.fieldErrors.phone}</small>
        )}
      </label>

      <label>
        <span>Preferred show</span>
        <select defaultValue="" name="showId" required>
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

      <label>
        <span>Preferred date</span>
        <input min={today} name="preferredDate" required type="date" />
        {state.fieldErrors.preferredDate && (
          <small role="alert">{state.fieldErrors.preferredDate}</small>
        )}
      </label>

      <label>
        <span>Expected number of guests</span>
        <input min={1} name="guestCount" required type="number" />
        {state.fieldErrors.guestCount && (
          <small role="alert">{state.fieldErrors.guestCount}</small>
        )}
      </label>

      <label>
        <span>Additional information</span>
        <textarea name="message" rows={3} />
      </label>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Sending…" : "Request booking"}
      </button>
    </form>
  );
}
