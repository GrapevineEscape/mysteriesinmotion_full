"use client";

import { useState } from "react";
import { ShowAccessPicker } from "@/components/admin/show-access-picker";
import { inviteTroupeMember } from "./actions";

export function InviteTroupeForm({
  shows,
}: {
  shows: { id: string; title: string }[];
}) {
  const [role, setRole] = useState("PERFORMER");

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
        <ShowAccessPicker
          description="Checked shows are the only ones available after they accept. Administrators can see every show."
          initialSelected={shows.map((show) => show.id)}
          legend="Shows this performer can see"
          shows={shows}
        />
      )}
      <button className="button button-primary" type="submit">
        Send invitation
      </button>
    </form>
  );
}
