"use client";

import { useActionState } from "react";
import { saveProfile } from "./actions";
import { emptyProfileState } from "./profile-state";

type Member = {
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  phone: string | null;
  bio: string | null;
};

export function ProfileForm({ member }: { member: Member }) {
  const [state, formAction, pending] = useActionState(
    saveProfile,
    emptyProfileState,
  );

  return (
    <form action={formAction} className="portal-form">
      {state.errors.length > 0 && (
        <div className="admin-alert admin-alert-error" role="alert">
          <strong>Please fix the following:</strong>
          <ul>
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {state.saved && (
        <p className="admin-alert" role="status">
          Profile updated.
        </p>
      )}

      <div className="portal-form-row">
        <label>
          <span>First name</span>
          <input
            autoComplete="given-name"
            defaultValue={member.firstName ?? ""}
            name="firstName"
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            autoComplete="family-name"
            defaultValue={member.lastName ?? ""}
            name="lastName"
          />
        </label>
      </div>

      <label>
        <span>Address</span>
        <input
          autoComplete="street-address"
          defaultValue={member.address ?? ""}
          name="address"
        />
      </label>

      <label>
        <span>Phone</span>
        <input
          autoComplete="tel"
          defaultValue={member.phone ?? ""}
          name="phone"
          placeholder="214-213-8719"
        />
        <small>
          Accepted: 2142138719, 214-213-8719, or (214) 213-8719. Saved as
          214-213-8719.
        </small>
      </label>

      <label>
        <span>Short bio</span>
        <textarea defaultValue={member.bio ?? ""} name="bio" rows={4} />
      </label>

      <label>
        <span>Headshot</span>
        <input accept="image/png,image/jpeg,image/webp" name="headshot" type="file" />
        <small>PNG, JPEG, or WebP, up to 5 MB.</small>
      </label>

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
