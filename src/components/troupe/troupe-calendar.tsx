"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import Link from "next/link";
import { useState } from "react";

export type CalendarDetail = {
  label: string;
  value: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  color: string;
  kind: "Show" | "Rehearsal";
  when: string;
  location: string;
  statusLabel: string;
  yourRole: string | null;
  notes: string | null;
  castingHref: string | null;
};

const LEGEND = [
  { label: "Open", color: "#81C784" },
  { label: "Fully cast", color: "#B39DDB" },
  { label: "Closed", color: "#E0E0E0" },
  { label: "Canceled", color: "#EF9A9A" },
  { label: "Rehearsal", color: "#90CAF9" },
];

/**
 * Month view of performances and rehearsals. Every event carries its own
 * details, so opening one is instant rather than a round trip the way the
 * Flask drawer worked.
 */
export function TroupeCalendar({ events }: { events: CalendarEvent[] }) {
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const byId = new Map(events.map((event) => [event.id, event]));

  return (
    <div className="portal-calendar">
      <ul aria-label="Calendar status legend" className="portal-calendar-legend">
        {LEGEND.map((entry) => (
          <li key={entry.label}>
            <span aria-hidden="true" style={{ background: entry.color }} />
            {entry.label}
          </li>
        ))}
      </ul>

      <FullCalendar
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          setSelected(byId.get(info.event.id) ?? null);
        }}
        eventDisplay="block"
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          color: event.color,
          textColor: "#18222a",
        }))}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,listMonth",
        }}
        height="auto"
        initialView="dayGridMonth"
        plugins={[dayGridPlugin, listPlugin]}
      />

      {selected && (
        <>
          <button
            aria-label="Close event details"
            className="portal-drawer-backdrop"
            onClick={() => setSelected(null)}
            type="button"
          />
          <aside aria-label="Event details" className="portal-drawer">
            <div className="portal-drawer-header">
              <h2>{selected.title}</h2>
              <button
                aria-label="Close"
                onClick={() => setSelected(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <dl className="portal-meta-grid">
              <div>
                <dt>When</dt>
                <dd>{selected.when}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selected.location}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selected.statusLabel}</dd>
              </div>
              {selected.yourRole && (
                <div>
                  <dt>Your role</dt>
                  <dd>{selected.yourRole}</dd>
                </div>
              )}
            </dl>
            {selected.notes && <p>{selected.notes}</p>}
            {selected.castingHref && (
              <Link
                className="button button-small button-primary"
                href={selected.castingHref}
              >
                Open casting
              </Link>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
