import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidPhoneError, formatUsPhone, normalizeUsPhone } from "./phone";

describe("normalizeUsPhone", () => {
  it("accepts the formats people actually type", () => {
    for (const input of [
      "2142138719",
      "214-213-8719",
      "(214)213-8719",
      "(214) 213-8719",
      "1-214-213-8719",
      "  214 213 8719  ",
      "+1 (214) 213-8719",
    ]) {
      assert.equal(normalizeUsPhone(input), "214-213-8719", `failed on ${input}`);
    }
  });

  it("treats blank input as absent rather than invalid", () => {
    assert.equal(normalizeUsPhone(""), null);
    assert.equal(normalizeUsPhone("   "), null);
    assert.equal(normalizeUsPhone(null), null);
    assert.equal(normalizeUsPhone(undefined), null);
  });

  it("rejects numbers that are not ten digits", () => {
    for (const input of ["214213871", "21421387190", "555"]) {
      assert.throws(() => normalizeUsPhone(input), InvalidPhoneError, `accepted ${input}`);
    }
  });

  it("only strips a leading country code from an eleven-digit number", () => {
    assert.throws(() => normalizeUsPhone("22142138719"), InvalidPhoneError);
  });
});

describe("formatUsPhone", () => {
  it("normalizes valid numbers", () => {
    assert.equal(formatUsPhone("(214) 213-8719"), "214-213-8719");
  });

  it("returns invalid input unchanged instead of throwing", () => {
    assert.equal(formatUsPhone("ext. 42"), "ext. 42");
    assert.equal(formatUsPhone(""), null);
  });
});
