"use client";

import { useState } from "react";

export function ShowAccessPicker({
  shows,
  initialSelected,
  legend,
  description,
}: {
  shows: { id: string; title: string }[];
  initialSelected: string[];
  legend: string;
  description: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initialSelected));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <fieldset className="invite-shows">
      <legend>{legend}</legend>
      <p>{description}</p>
      <div className="button-row">
        <button
          className="button button-small button-ghost"
          type="button"
          onClick={() => setSelected(new Set(shows.map((show) => show.id)))}
        >
          Select all
        </button>
        <button
          className="button button-small button-ghost"
          type="button"
          onClick={() => setSelected(new Set())}
        >
          Clear all
        </button>
      </div>
      {shows.length ? (
        <ul>
          {shows.map((show) => (
            <li key={show.id}>
              <label>
                <input
                  checked={selected.has(show.id)}
                  name="showId"
                  type="checkbox"
                  value={show.id}
                  onChange={() => toggle(show.id)}
                />
                <span>{show.title}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p>No shows are in the catalog yet.</p>
      )}
    </fieldset>
  );
}
