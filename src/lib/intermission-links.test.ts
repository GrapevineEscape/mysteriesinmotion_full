import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  intermissionLinksFromForm,
  parseIntermissionLinks,
} from "@/lib/intermission-links";

describe("intermission links", () => {
  it("keeps three http pages and drops a blank or unsafe row", () => {
    const form = new FormData();
    form.append("linkLabel", "FocusTec news");
    form.append("linkUrl", "https://example.com/news");
    form.append("linkNote", "Look for the missing executive");
    form.append("linkPicture", "https://example.com/shot.jpg");
    form.append("linkLabel", "Skip me");
    form.append("linkUrl", "javascript:alert(1)");
    form.append("linkNote", "");
    form.append("linkPicture", "");
    form.append("linkLabel", "");
    form.append("linkUrl", "");
    form.append("linkNote", "");
    form.append("linkPicture", "");

    assert.deepEqual(intermissionLinksFromForm(form), [
      {
        label: "FocusTec news",
        url: "https://example.com/news",
        note: "Look for the missing executive",
        pictureUrl: "https://example.com/shot.jpg",
      },
    ]);
  });

  it("reads saved links back into the player", () => {
    assert.deepEqual(
      parseIntermissionLinks([
        { label: "Blotter", url: "https://example.com/blotter", note: "" },
      ]),
      [
        {
          label: "Blotter",
          url: "https://example.com/blotter",
          note: "",
          pictureUrl: "",
        },
      ],
    );
  });
});
