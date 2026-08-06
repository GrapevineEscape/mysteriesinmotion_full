import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToPlainText, looksLikeHtml } from "./plain-text";

describe("htmlToPlainText", () => {
  it("strips bold tags left by Flask show copy", () => {
    assert.equal(
      htmlToPlainText(
        "<b>Murder, Preserved</b> is an enthralling mystery set during a unique time capsule reveal party.",
      ),
      "Murder, Preserved is an enthralling mystery set during a unique time capsule reveal party.",
    );
  });

  it("turns breaks into newlines and decodes entities", () => {
    assert.equal(
      htmlToPlainText("Act&nbsp;one<br/>&amp; then &quot;two&quot;"),
      'Act one\n& then "two"',
    );
  });

  it("recognises leftover markup", () => {
    assert.equal(looksLikeHtml("<b>Hi</b>"), true);
    assert.equal(looksLikeHtml("Plain copy"), false);
  });
});
