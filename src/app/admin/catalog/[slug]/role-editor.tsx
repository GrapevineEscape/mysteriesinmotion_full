"use client";

import { useState } from "react";
import { saveRole } from "../actions";

type Role = {
  id: string;
  name: string;
  gender: string;
  age: string;
  description: string;
  displayOrder: number;
};

export function RoleEditor({
  showId,
  role,
}: {
  showId: string;
  role?: Role;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        className={`button button-small ${role ? "button-ghost" : "button-primary"}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        {role ? "Edit" : "Add a role"}
      </button>
    );
  }

  return (
    <form action={saveRole} className="portal-form admin-role-form">
      <input name="showId" type="hidden" value={showId} />
      {role && <input name="roleId" type="hidden" value={role.id} />}

      <label>
        <span>Character name</span>
        <input autoFocus defaultValue={role?.name ?? ""} name="name" required />
      </label>

      <div className="portal-form-row">
        <label>
          <span>Gender</span>
          <input
            defaultValue={role?.gender ?? "Any"}
            name="gender"
            placeholder="Any"
          />
        </label>
        <label>
          <span>Age range</span>
          <input defaultValue={role?.age ?? "Any"} name="age" placeholder="Any" />
        </label>
        <label>
          <span>Order</span>
          <input
            defaultValue={role?.displayOrder ?? 0}
            min={0}
            name="displayOrder"
            type="number"
          />
        </label>
      </div>

      <label>
        <span>Description</span>
        <textarea defaultValue={role?.description ?? ""} name="description" rows={3} />
      </label>

      <div className="button-row">
        <button className="button button-small button-primary" type="submit">
          {role ? "Save role" : "Add role"}
        </button>
        <button
          className="button button-small button-ghost"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
