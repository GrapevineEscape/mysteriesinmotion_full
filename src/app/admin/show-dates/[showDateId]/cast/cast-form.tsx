"use client";

import { useActionState } from "react";
import { saveWizardCast } from "../../actions";
import { emptyWizardState } from "../../wizard-state";

type Performer = { id: string; label: string };

type RoleOption = {
  id: string;
  name: string;
  gender: string;
  age: string;
  /** Performers approved on the roster for this role, listed first. */
  roster: Performer[];
  assignedPerformerId: string | null;
};

export function CastForm({
  showDateId,
  roles,
  performers,
}: {
  showDateId: string;
  roles: RoleOption[];
  performers: Performer[];
}) {
  const [state, formAction, pending] = useActionState(
    saveWizardCast,
    emptyWizardState,
  );

  return (
    <form action={formAction} className="portal-form">
      <input name="showDateId" type="hidden" value={showDateId} />

      {state.errors.length > 0 && (
        <div className="admin-alert admin-alert-error" role="alert">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-cast-grid">
        {roles.map((role) => {
          const rosterIds = new Set(role.roster.map((person) => person.id));
          const others = performers.filter((person) => !rosterIds.has(person.id));

          return (
            <label key={role.id}>
              <span>{role.name}</span>
              <small>
                {role.gender} · {role.age}
              </small>
              <select
                defaultValue={role.assignedPerformerId ?? ""}
                name={`role-${role.id}`}
              >
                <option value="">Leave open for casting</option>
                {role.roster.length > 0 && (
                  <optgroup label="On the roster for this role">
                    {role.roster.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="Everyone else">
                    {others.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          );
        })}
      </div>

      <div className="button-row">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save cast and continue"}
        </button>
        <button
          className="button button-ghost"
          disabled={pending}
          name="action"
          type="submit"
          value="skip"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
