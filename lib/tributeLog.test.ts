import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { load, log, runStreak } from "./tributeLog";

describe("tributeLog", () => {
  it("runStreak counts consecutive days and stops at a gap", () => {
    const id = "tribute-streak-test";
    for (const day of ["2026-07-01", "2026-07-04", "2026-07-05", "2026-07-06"]) {
      log(id, {
        id: `run-${day}`,
        challengeId: "c1",
        completedAt: `${day}T12:00:00Z`,
        minutes: 10,
        intensity: "hot",
      });
    }
    assert.equal(runStreak(id), 3);
  });

  it("log caps at 100 and puts newest first", () => {
    const id = "tribute-cap-test";
    for (let i = 0; i < 115; i++) {
      log(id, {
        id: `run-${i}`,
        challengeId: "c1",
        completedAt: new Date(1000 * i).toISOString(),
        minutes: 5,
        intensity: "warm",
      });
    }
    const list = load(id);
    assert.equal(list.length, 100);
    assert.equal(list[0].id, "run-114");
  });
});
