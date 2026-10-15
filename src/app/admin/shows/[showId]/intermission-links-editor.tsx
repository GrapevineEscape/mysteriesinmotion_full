"use client";

import { useState } from "react";
import {
  MAX_INTERMISSION_LINKS,
  type IntermissionLink,
} from "@/lib/intermission-links";

export function IntermissionLinksEditor({
  initialLinks,
}: {
  initialLinks: IntermissionLink[];
}) {
  const [links, setLinks] = useState<IntermissionLink[]>(initialLinks);

  function update(index: number, field: keyof IntermissionLink, value: string) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  return (
    <div className="intermission-link-editor">
      <h3>Pages detectives may open</h3>
      <p>
        Start with none. Add a page when you have one, up to five. Address is
        what the detective sees in the browser bar. Leave Picture empty for a
        live page such as a YouTube embed. For a site that will not appear
        inside the desk, paste the screenshot address in Picture.
      </p>
      {links.map((link, index) => (
        <div className="question-editor-grid" key={index}>
          <label>
            <span>Page {index + 1} label</span>
            <input
              name="linkLabel"
              value={link.label}
              onChange={(event) => update(index, "label", event.target.value)}
            />
          </label>
          <label>
            <span>Address</span>
            <input
              name="linkUrl"
              placeholder="https://"
              value={link.url}
              onChange={(event) => update(index, "url", event.target.value)}
            />
          </label>
          <label className="wide-field">
            <span>Note under the button</span>
            <input
              name="linkNote"
              placeholder="What they should look for"
              value={link.note}
              onChange={(event) => update(index, "note", event.target.value)}
            />
          </label>
          <label className="wide-field">
            <span>Picture</span>
            <input
              name="linkPicture"
              placeholder="https://… or r2://bucket/path/screenshot.jpg"
              value={link.pictureUrl}
              onChange={(event) => update(index, "pictureUrl", event.target.value)}
            />
          </label>
          <button
            className="button button-small button-ghost"
            type="button"
            onClick={() =>
              setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index))
            }
          >
            Remove page {index + 1}
          </button>
        </div>
      ))}
      {links.length < MAX_INTERMISSION_LINKS && (
        <button
          className="button button-small button-ghost"
          type="button"
          onClick={() =>
            setLinks((current) => [
              ...current,
              { label: "", url: "", note: "", pictureUrl: "" },
            ])
          }
        >
          Add a page
        </button>
      )}
    </div>
  );
}
