import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dayInZone, timeInZone, zonedInstant } from "@/lib/app-time";
import {
  defaultTechDate,
  suggestRehearsalDates,
} from "@/lib/rehearsal-schedule";

const showDate = zonedInstant("2026-06-20", "19:30");

describe("suggestRehearsalDates", () => {
  it("spreads a fortnight of rehearsals the way the Flask wizard did", () => {
    const suggested = suggestRehearsalDates(showDate, 14, 4);
    assert.deepEqual(
      suggested.map((instant) => dayInZone(instant)),
      ["2026-06-06", "2026-06-09", "2026-06-12", "2026-06-15"],
    );
  });

  it("puts every rehearsal in the evening", () => {
    for (const instant of suggestRehearsalDates(showDate, 14, 4)) {
      assert.equal(timeInZone(instant), "19:00");
    }
  });

  it("never suggests the performance day itself", () => {
    const suggested = suggestRehearsalDates(showDate, 3, 3);
    assert.ok(
      suggested.every((instant) => dayInZone(instant) < "2026-06-20"),
      "a rehearsal was scheduled on the performance day",
    );
  });

  it("returns nothing when none are wanted or there is no runway", () => {
    assert.deepEqual(suggestRehearsalDates(showDate, 14, 0), []);
    assert.deepEqual(suggestRehearsalDates(showDate, 0, 4), []);
  });

  it("caps the count so a stray input cannot flood the schedule", () => {
    assert.ok(suggestRehearsalDates(showDate, 30, 999).length <= 8);
  });

  it("does not suggest the same day twice when the window is tight", () => {
    const days = suggestRehearsalDates(showDate, 2, 6).map((instant) =>
      dayInZone(instant),
    );
    assert.equal(new Set(days).size, days.length);
  });
});

describe("defaultTechDate", () => {
  it("suggests the evening before the performance", () => {
    const tech = defaultTechDate(showDate);
    assert.equal(dayInZone(tech), "2026-06-19");
    assert.equal(timeInZone(tech), "19:00");
  });
});
