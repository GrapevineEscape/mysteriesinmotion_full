import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    assert.equal(slugify("Murder at the Manor"), "murder-at-the-manor");
  });

  it("drops punctuation and collapses separators", () => {
    assert.equal(slugify("Who Killed Mr. Bell?!"), "who-killed-mr-bell");
    assert.equal(slugify("  spaced   out  "), "spaced-out");
  });

  it("strips accents rather than dropping the letter", () => {
    assert.equal(slugify("Café Noir"), "cafe-noir");
  });
});

describe("uniqueSlug", () => {
  it("keeps the plain slug when nothing holds it", () => {
    assert.equal(uniqueSlug("Murder at the Manor", []), "murder-at-the-manor");
  });

  it("suffixes rather than overwriting an existing address", () => {
    assert.equal(uniqueSlug("Encore", ["encore"]), "encore-2");
    assert.equal(uniqueSlug("Encore", ["encore", "encore-2"]), "encore-3");
  });

  it("falls back to a usable slug when the title has no letters", () => {
    assert.equal(uniqueSlug("!!!", []), "show");
  });
});
