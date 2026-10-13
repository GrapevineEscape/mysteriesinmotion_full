"use client";

import { ShowAccessPicker } from "@/components/admin/show-access-picker";
import { updatePerformerShows } from "./actions";

export function PerformerShowAccessForm({
  performerId,
  shows,
  initialSelected,
  unrestricted,
}: {
  performerId: string;
  shows: { id: string; title: string }[];
  initialSelected: string[];
  unrestricted: boolean;
}) {
  return (
    <form action={updatePerformerShows} className="portal-panel">
      <input name="performerId" type="hidden" value={performerId} />
      <div className="portal-panel-heading">
        <h2>Shows they can see</h2>
      </div>
      <ShowAccessPicker
        description={
          unrestricted
            ? "This performer can currently see every show, including shows added later. Saving the checked list limits them to those shows."
            : "Checked shows are the only ones this performer can open."
        }
        initialSelected={initialSelected}
        legend="Show access"
        shows={shows}
      />
      <div className="button-row">
        <button className="button button-primary" name="access" type="submit" value="limited">
          Save show access
        </button>
        {!unrestricted && (
          <button className="button button-ghost" name="access" type="submit" value="open">
            Allow every show
          </button>
        )}
      </div>
    </form>
  );
}
