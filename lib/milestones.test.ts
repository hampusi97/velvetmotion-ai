import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "./relationshipState";
import { dueMilestones, MILESTONES } from "./milestones";

describe("milestones", () => {
  it("day-7 fires at 7 and not at 6", () => {
    const day6 = { ...emptyState("camille-laurent"), streak: { current: 6, best: 6 } };
    assert.equal(dueMilestones(day6).some((m) => m.id === "day-7"), false);

    const day7 = { ...emptyState("camille-laurent"), streak: { current: 7, best: 7 } };
    assert.equal(dueMilestones(day7).some((m) => m.id === "day-7"), true);
  });

  it("already-recorded milestones do not repeat", () => {
    const s = {
      ...emptyState("camille-laurent"),
      streak: { current: 10, best: 10 },
      milestones: ["day-7"],
    };
    assert.equal(dueMilestones(s).some((m) => m.id === "day-7"), false);
  });

  it("every milestone with an unlock key defines a non-empty unlock string", () => {
    const withUnlock = MILESTONES.filter((m) => m.unlock !== undefined);
    assert.ok(withUnlock.length >= 4);
    for (const m of withUnlock) {
      assert.ok(typeof m.unlock === "string" && m.unlock.length > 0);
    }
  });
});
