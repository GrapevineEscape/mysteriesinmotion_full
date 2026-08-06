"use client";

import { useActionState } from "react";
import type { ShowStatus, ShowType } from "@prisma/client";
import { SHOW_TYPE_LABELS } from "@/lib/show-types";
import { createShow, updateShow } from "./actions";
import { emptyCatalogState } from "./catalog-state";

type Show = {
  id: string;
  title: string;
  type: ShowType;
  shortDescription: string;
  fullDescription: string;
  kidFriendly: boolean;
  status: ShowStatus;
  difficulty: string | null;
  ageRecommendation: string | null;
  contentAdvisory: string | null;
  scriptUrl: string | null;
  coverImageUrl: string | null;
};

const STATUSES: { value: ShowStatus; label: string; hint: string }[] = [
  { value: "DRAFT", label: "Draft", hint: "Only visible in administration." },
  { value: "PUBLISHED", label: "Published", hint: "Live on the website." },
  { value: "ARCHIVED", label: "Archived", hint: "Retired but kept on record." },
];

export function ShowForm({ show }: { show?: Show }) {
  const [state, formAction, pending] = useActionState(
    show ? updateShow : createShow,
    emptyCatalogState,
  );

  return (
    <form action={formAction} className="portal-form">
      {show && <input name="id" type="hidden" value={show.id} />}

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
          Show saved.
        </p>
      )}

      <label>
        <span>Title</span>
        <input defaultValue={show?.title ?? ""} name="title" required />
        {show ? (
          <small>
            Renaming keeps the existing web address so shared links keep working.
          </small>
        ) : (
          <small>The web address is generated from the title.</small>
        )}
      </label>

      <div className="portal-form-row">
        <label>
          <span>Type</span>
          <select defaultValue={show?.type ?? "STANDARD"} name="type">
            {Object.entries(SHOW_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select defaultValue={show?.status ?? "DRAFT"} name="status">
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <small>
            {
              STATUSES.find((status) => status.value === (show?.status ?? "DRAFT"))
                ?.hint
            }
          </small>
        </label>
      </div>

      <label>
        <span>Short description</span>
        <textarea
          defaultValue={show?.shortDescription ?? ""}
          name="shortDescription"
          required
          rows={2}
        />
        <small>Shown on catalog cards.</small>
      </label>

      <label>
        <span>Full description</span>
        <textarea
          defaultValue={show?.fullDescription ?? ""}
          name="fullDescription"
          rows={6}
        />
      </label>

      <div className="portal-form-row">
        <label>
          <span>Difficulty</span>
          <input
            defaultValue={show?.difficulty ?? ""}
            name="difficulty"
            placeholder="Moderate"
          />
        </label>
        <label>
          <span>Age recommendation</span>
          <input
            defaultValue={show?.ageRecommendation ?? ""}
            name="ageRecommendation"
            placeholder="12 and up"
          />
        </label>
      </div>

      <label>
        <span>Content advisory</span>
        <textarea
          defaultValue={show?.contentAdvisory ?? ""}
          name="contentAdvisory"
          rows={2}
        />
      </label>

      <label className="portal-checkbox">
        <input
          defaultChecked={show?.kidFriendly ?? false}
          name="kidFriendly"
          type="checkbox"
        />
        <span>Suitable for children</span>
      </label>

      {show && (
        <>
          <label>
            <span>Cover image</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              name="coverImage"
              type="file"
            />
            <small>
              {show.coverImageUrl
                ? "An image is on file. Uploading replaces it."
                : "PNG, JPEG, or WebP, up to 8 MB."}
            </small>
          </label>

          <label>
            <span>Script</span>
            <input accept="application/pdf" name="script" type="file" />
            <small>
              {show.scriptUrl
                ? "A script is on file. Uploading replaces it. Only signed-in troupe members can open it."
                : "PDF up to 25 MB. Only signed-in troupe members can open it."}
            </small>
          </label>
        </>
      )}

      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : show ? "Save show" : "Create show"}
      </button>
    </form>
  );
}
