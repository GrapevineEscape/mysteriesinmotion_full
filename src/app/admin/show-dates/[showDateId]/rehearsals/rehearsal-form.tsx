"use client";

import { useActionState, useState } from "react";
import { saveWizardRehearsals } from "../../actions";
import { emptyWizardState } from "../../wizard-state";

type Suggestion = { value: string; label: string };

export function RehearsalForm({
  showDateId,
  suggestions,
  timeframe,
  count,
  defaultLocation,
  defaultTech,
  hasTech,
}: {
  showDateId: string;
  suggestions: Suggestion[];
  timeframe: number;
  count: number;
  defaultLocation: string;
  defaultTech: string;
  hasTech: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveWizardRehearsals,
    emptyWizardState,
  );
  const [includeTech, setIncludeTech] = useState(hasTech);
  const [excluded, setExcluded] = useState<number[]>([]);

  return (
    <form action={formAction} className="portal-form">
      <input name="showDateId" type="hidden" value={showDateId} />
      <input name="rehearsalTimeframe" type="hidden" value={timeframe} />

      {state.errors.length > 0 && (
        <div className="admin-alert admin-alert-error" role="alert">
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length ? (
        <ul className="admin-rehearsal-list">
          {suggestions.map((suggestion, index) => {
            const included = !excluded.includes(index);
            return (
              <li data-included={included} key={index}>
                <label className="portal-checkbox">
                  <input
                    checked={included}
                    onChange={() =>
                      setExcluded((current) =>
                        included
                          ? [...current, index]
                          : current.filter((value) => value !== index),
                      )
                    }
                    type="checkbox"
                  />
                  <span>Rehearsal {index + 1}</span>
                </label>
                {included && <input name="include" type="hidden" value={index} />}
                <input
                  defaultValue={suggestion.value}
                  disabled={!included}
                  name={`rehearsalDate-${index}`}
                  type="datetime-local"
                />
                <input
                  defaultValue={defaultLocation}
                  disabled={!included}
                  name={`rehearsalLocation-${index}`}
                  placeholder="Location"
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="page-intro">
          No rehearsals suggested. Use the counts above to generate some, or carry
          on without any.
        </p>
      )}

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
                defaultValue={defaultTech}
                name="techDate"
                type="datetime-local"
              />
            </label>
            <label>
              <span>Where</span>
              <input
                defaultValue={defaultLocation}
                name="techLocation"
                placeholder="Location"
              />
            </label>
          </div>
        )}
      </fieldset>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending
          ? "Saving…"
          : `Save ${count - excluded.length} ${
              count - excluded.length === 1 ? "rehearsal" : "rehearsals"
            } and continue`}
      </button>
    </form>
  );
}
