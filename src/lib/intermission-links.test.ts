import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  intermissionLinksFromForm,
  parseIntermissionLinks,
} from "@/lib/intermission-links";

describe("intermission links", () => {
  it("keeps three http pages and drops a blank or unsafe row", () => {
    const form = new FormData();
    form.set("linkLabel1", "FocusTec news");
    form.set("linkUrl1", "https://example.com/news");
    form.set("linkNote1", "Look for the missing executive");
    form.set("linkLabel2", "Skip me");
    form.set("linkUrl2", "javascript:alert(1)");
    form.set("linkLabel3", "");
    form.set("linkUrl3", "");

    assert.deepEqual(intermissionLinksFromForm(form), [
      {
        label: "FocusTec news",
        url: "https://example.com/news",
        note: "Look for the missing executive",
      },
    ]);
  });

  it("reads saved links back into the player", () => {
    assert.deepEqual(
      parseIntermissionLinks([
        { label: "Blotter", url: "https://example.com/blotter", note: "" },
      ]),
      [{ label: "Blotter", url: "https://example.com/blotter", note: "" }],
    );
  });
});
