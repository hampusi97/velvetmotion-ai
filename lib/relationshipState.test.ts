import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  migrate,
  recordSession,
  recordVisit,
  type SessionRecord,
} from "./relationshipState";

afterEach(() => {
  mock.timers.reset();
});

describe("relationshipState", () => {
  it("recordVisit is idempotent within a day", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-05-10T10:00:00Z") });
    const first = recordVisit(emptyState("camille-laurent"));
    assert.equal(first.streak.current, 1);
    assert.equal(first.streak.best, 1);
    assert.equal(first.streak.lastDay, "2026-05-10");

    mock.timers.setTime(new Date("2026-05-10T18:30:00Z").getTime());
    const second = recordVisit(first);
    assert.equal(second.streak.current, 1);
    assert.equal(second.streak.best, 1);
  });

  it("consecutive days increment streak and a gap resets to 1 while preserving best", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-05-10T12:00:00Z") });
    let s = recordVisit(emptyState("camille-laurent"));
    assert.equal(s.streak.current, 1);

    mock.timers.setTime(new Date("2026-05-11T12:00:00Z").getTime());
    s = recordVisit(s);
    assert.equal(s.streak.current, 2);
    assert.equal(s.streak.best, 2);

    mock.timers.setTime(new Date("2026-05-12T12:00:00Z").getTime());
    s = recordVisit(s);
    assert.equal(s.streak.current, 3);
    assert.equal(s.streak.best, 3);

    // 3-day gap -> resets current to 1, preserves best = 3
    mock.timers.setTime(new Date("2026-05-15T12:00:00Z").getTime());
    s = recordVisit(s);
    assert.equal(s.streak.current, 1);
    assert.equal(s.streak.best, 3);
  });

  it("migrate repairs junk without throwing", () => {
    assert.deepEqual(migrate(null, "yuki-sato"), emptyState("yuki-sato"));
    assert.deepEqual(migrate("corrupt", "yuki-sato"), emptyState("yuki-sato"));
    const repaired = migrate(
      {
        v: 99,
        status: "invalid-status",
        sphTier: 99,
        streak: { current: 5, best: 2 },
        milestones: ["day-7", 123, null],
      },
      "yuki-sato",
    );
    assert.equal(repaired.status, "pussyfree");
    assert.equal(repaired.sphTier, 2);
    assert.equal(repaired.streak.current, 5);
    assert.equal(repaired.streak.best, 5);
    assert.deepEqual(repaired.milestones, ["day-7"]);
  });

  it("caps sessions at 50", () => {
    let s = emptyState("daisy-miller");
    for (let i = 0; i < 60; i++) {
      const rec: SessionRecord = {
        id: `sess-${i}`,
        startedAt: new Date(1000 * i).toISOString(),
        durationSec: 120,
        edges: 2,
        tier: 2,
      };
      s = recordSession(s, rec);
    }
    assert.equal(s.sessions.length, 50);
    assert.equal(s.sessions[0].id, "sess-59");
  });
});
