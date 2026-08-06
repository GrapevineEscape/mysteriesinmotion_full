import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  appToday,
  dayInZone,
  parseLocalDateTime,
  startOfDayInZone,
  toLocalDateTimeInput,
} from "@/lib/app-time";
import {
  castingStatusLabel,
  isCastingOpen,
  isForwardVisible,
  nextCastStatus,
} from "@/lib/show-date-lifecycle";

const CHICAGO = "America/Chicago";

describe("calendar days in the troupe timezone", () => {
  it("keeps a late evening show on its own day", () => {
    // 8pm Central on 14 June is already 15 June in UTC.
    const curtain = new Date("2026-06-15T01:00:00Z");
    assert.equal(dayInZone(curtain, CHICAGO), "2026-06-14");
  });

  it("resolves midnight during daylight saving time", () => {
    assert.equal(
      startOfDayInZone("2026-06-14", CHICAGO).toISOString(),
      "2026-06-14T05:00:00.000Z",
    );
  });

  it("resolves midnight during standard time", () => {
    assert.equal(
      startOfDayInZone("2026-01-14", CHICAGO).toISOString(),
      "2026-01-14T06:00:00.000Z",
    );
  });

  it("resolves midnight on the spring-forward day", () => {
    // The clocks jump at 2am, so midnight itself is still standard time.
    assert.equal(
      startOfDayInZone("2026-03-08", CHICAGO).toISOString(),
      "2026-03-08T06:00:00.000Z",
    );
  });

  it("adds days without drifting across a daylight-saving boundary", () => {
    assert.equal(addDays("2026-03-07", 1), "2026-03-08");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });

  it("reports today in the troupe timezone, not the server's", () => {
    const justAfterMidnightUtc = new Date("2026-06-15T02:00:00Z");
    assert.equal(appToday(justAfterMidnightUtc, CHICAGO), "2026-06-14");
  });
});

describe("datetime-local values", () => {
  it("reads a form value as troupe local time", () => {
    assert.equal(
      parseLocalDateTime("2026-06-14T19:30", CHICAGO)?.toISOString(),
      "2026-06-15T00:30:00.000Z",
    );
  });

  it("survives a round trip through the input", () => {
    const value = "2026-01-04T08:05";
    const instant = parseLocalDateTime(value, CHICAGO);
    assert.equal(toLocalDateTimeInput(instant, CHICAGO), value);
  });

  it("rejects anything the browser did not fill in", () => {
    for (const value of ["", "2026-06-14", "not a date", null, undefined]) {
      assert.equal(parseLocalDateTime(value, CHICAGO), null, String(value));
    }
  });

  it("renders an empty input for a missing date", () => {
    assert.equal(toLocalDateTimeInput(null, CHICAGO), "");
  });
});

describe("forward visibility", () => {
  const today = "2026-06-14";
  const showAt = (day: string) => new Date(`${day}T20:00:00Z`);

  it("keeps a performance visible on its own day", () => {
    assert.equal(
      isForwardVisible({ date: showAt(today), status: "OPEN" }, today),
      true,
    );
  });

  it("drops a performance the day after", () => {
    assert.equal(
      isForwardVisible({ date: showAt("2026-06-13"), status: "OPEN" }, today),
      false,
    );
  });

  it("shows a canceled date until it passes, then treats it as history", () => {
    assert.equal(
      isForwardVisible({ date: showAt("2026-06-20"), status: "CANCELED" }, today),
      true,
    );
    assert.equal(
      isForwardVisible({ date: showAt("2026-06-01"), status: "CANCELED" }, today),
      false,
    );
  });

  it("treats a closed date as history even when it is still upcoming", () => {
    assert.equal(
      isForwardVisible({ date: showAt("2026-07-01"), status: "CLOSED" }, today),
      false,
    );
  });

  it("opens casting only for open and fully cast dates", () => {
    const date = showAt("2026-06-20");
    assert.equal(isCastingOpen({ date, status: "OPEN" }, today), true);
    assert.equal(isCastingOpen({ date, status: "FULLY_CAST" }, today), true);
    assert.equal(isCastingOpen({ date, status: "DRAFT" }, today), false);
    assert.equal(isCastingOpen({ date, status: "CANCELED" }, today), false);
  });
});

describe("cast status", () => {
  it("promotes to fully cast when every role is confirmed", () => {
    assert.equal(nextCastStatus("OPEN", 4, 4), "FULLY_CAST");
  });

  it("reopens when a confirmed performer drops out", () => {
    assert.equal(nextCastStatus("FULLY_CAST", 4, 3), "OPEN");
  });

  it("never promotes a show with no roles defined", () => {
    assert.equal(nextCastStatus("OPEN", 0, 0), "OPEN");
  });

  it("leaves draft, closed, and canceled dates alone", () => {
    assert.equal(nextCastStatus("DRAFT", 2, 2), "DRAFT");
    assert.equal(nextCastStatus("CLOSED", 2, 2), "CLOSED");
    assert.equal(nextCastStatus("CANCELED", 2, 2), "CANCELED");
  });
});

describe("casting status label", () => {
  it("describes each stage of casting", () => {
    assert.equal(castingStatusLabel(0, 0, 0), "No roles defined");
    assert.equal(castingStatusLabel(4, 0, 0), "Not cast");
    assert.equal(castingStatusLabel(4, 2, 0), "2/4 confirmed");
    assert.equal(castingStatusLabel(4, 2, 1), "2/4 confirmed, 1 offered");
    assert.equal(castingStatusLabel(4, 4, 0), "Fully cast");
  });
});
