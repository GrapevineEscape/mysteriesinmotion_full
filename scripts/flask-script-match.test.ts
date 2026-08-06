import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { matchScript, storedFilename } from "./flask-script-match";

/** The actual contents of MIM Website/app/static/MIMscripts. */
const SCRIPTS = [
  "A Chance to Die - Final.pdf",
  "Dog Show Debacle_v8.pdf",
  "Fidget PI and the Case of the Missing Gems - V5.pdf",
  "Holiday Inheritance v6.pdf",
  "Medieval Misfortune FINAL_v4.pdf",
  "Missing Millions_v7 WITH SOLUTION.pdf",
  "Murder for Real_v4.pdf",
  "Murder Preserved v2.pdf",
  "Round and Round - FINAL_V4.pdf",
  "Spies in Disguise_v3.pdf",
  "The Final Note - Complete EDITED 4-12-24.pdf",
  "The Missing Mascot_v5.pdf",
  "Vineyard of Good and Evil - v5 WITH PUZZLES.pdf",
];

describe("storedFilename", () => {
  test("takes the filename out of a stored url path", () => {
    assert.equal(
      storedFilename("/static/MIMscripts/Missing Millions_script.pdf"),
      "Missing Millions_script.pdf",
    );
  });

  test("tolerates windows separators", () => {
    assert.equal(storedFilename("static\\MIMscripts\\Foo.pdf"), "Foo.pdf");
  });

  test("treats an absent or meaningless path as no path", () => {
    assert.equal(storedFilename(null), null);
    assert.equal(storedFilename(""), null);
    assert.equal(storedFilename("/static/MIMscripts/.."), null);
  });
});

describe("matchScript", () => {
  test("prefers the file the database points at", () => {
    const match = matchScript(
      { title: "Murder Preserved", scriptPath: "/static/MIMscripts/Murder for Real_v4.pdf" },
      SCRIPTS,
    );
    assert.deepEqual(match, { filename: "Murder for Real_v4.pdf", how: "stored-path" });
  });

  test("falls back to the upload naming convention", () => {
    const match = matchScript({ title: "Missing Millions", scriptPath: null }, [
      ...SCRIPTS,
      "Missing Millions_script.pdf",
    ]);
    assert.deepEqual(match, { filename: "Missing Millions_script.pdf", how: "title-convention" });
  });

  test("ignores a stored path whose file is gone", () => {
    const match = matchScript(
      { title: "Spies in Disguise", scriptPath: "/static/MIMscripts/Spies in Disguise_script.pdf" },
      SCRIPTS,
    );
    assert.deepEqual(match, { filename: "Spies in Disguise_v3.pdf", how: "title-in-filename" });
  });

  test("resolves every real show title to its own script", () => {
    const expected: Record<string, string> = {
      "A Chance to Die": "A Chance to Die - Final.pdf",
      "Dog Show Debacle": "Dog Show Debacle_v8.pdf",
      "Fidget PI and the Case of the Missing Gems":
        "Fidget PI and the Case of the Missing Gems - V5.pdf",
      "Holiday Inheritance": "Holiday Inheritance v6.pdf",
      "Medieval Misfortune": "Medieval Misfortune FINAL_v4.pdf",
      "Missing Millions": "Missing Millions_v7 WITH SOLUTION.pdf",
      "Murder for Real": "Murder for Real_v4.pdf",
      "Murder Preserved": "Murder Preserved v2.pdf",
      "Round and Round": "Round and Round - FINAL_V4.pdf",
      "Spies in Disguise": "Spies in Disguise_v3.pdf",
      "The Final Note": "The Final Note - Complete EDITED 4-12-24.pdf",
      "The Missing Mascot": "The Missing Mascot_v5.pdf",
      "Vineyard of Good and Evil": "Vineyard of Good and Evil - v5 WITH PUZZLES.pdf",
    };

    for (const [title, filename] of Object.entries(expected)) {
      const match = matchScript({ title, scriptPath: null }, SCRIPTS);
      assert.equal(match?.filename, filename, `${title} should resolve to ${filename}`);
    }
  });

  test("keeps the two Missing titles apart", () => {
    assert.equal(
      matchScript({ title: "The Missing Mascot", scriptPath: null }, SCRIPTS)?.filename,
      "The Missing Mascot_v5.pdf",
    );
    assert.equal(
      matchScript({ title: "Missing Millions", scriptPath: null }, SCRIPTS)?.filename,
      "Missing Millions_v7 WITH SOLUTION.pdf",
    );
  });

  test("reports nothing when no script resembles the title", () => {
    assert.equal(matchScript({ title: "Zeppelin Heist", scriptPath: null }, SCRIPTS), null);
  });

  test("reports nothing when the folder is empty", () => {
    assert.equal(matchScript({ title: "Murder for Real", scriptPath: null }, []), null);
  });
});
