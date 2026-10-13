"use client";

import { useState } from "react";
import { inviteTroupeMember } from "./actions";

export function InviteTroupeForm({
  shows,
}: {
  shows: { id: string; title: string }[];
}) {
  const [role, setRole] = useState("PERFORMER");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(shows.map((show) => show.id)),
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={inviteTroupeMember} className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p className="card-kicker">New invitation</p>
          <h2>Invite someone to the troupe</h2>
        </div>
      </div>
      <div className="question-editor-grid">
        <label>
          <span>Email address</span>
          <input
            name="email"
            placeholder="performer@example.com"
            required
            type="email"
          />
        </label>
        <label>
          <span>Access level</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="PERFORMER">Performer</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
      </div>
      {role === "PERFORMER" && (
        <fieldset className="invite-shows">
          <legend>Shows this performer can see</legend>
          <p>
            Checked shows are the only ones available after they accept.
            Administrators can see every show.
          </p>
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
      )}
      <button className="button button-primary" type="submit">
        Send invitation
      </button>
    </form>
  );
}
