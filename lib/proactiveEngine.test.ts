import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "./relationshipState";
import { decideProactive } from "./proactiveEngine";

afterEach(() => {
  mock.timers.reset();
});

describe("proactiveEngine", () => {
  it("is suppressed inside the 6-hour gap", () => {
    const now = new Date("2026-05-10T22:00:00Z");
    mock.timers.enable({ apis: ["Date"], now });
    const s = {
      ...emptyState("camille-laurent"),
      streak: { current: 7, best: 7 },
      lastProactive: new Date("2026-05-10T18:00:00Z").toISOString(),
    };
    assert.equal(decideProactive(s, now).should, false);
  });

  it("milestone outranks absence", () => {
    const now = new Date("2026-05-10T15:00:00Z");
    mock.timers.enable({ apis: ["Date"], now });
    const s = {
      ...emptyState("camille-laurent"),
      streak: { current: 7, best: 7 },
      lastSeen: new Date("2026-05-01T12:00:00Z").toISOString(),
    };
    const dec = decideProactive(s, now);
    assert.equal(dec.should, true);
    assert.equal(dec.kind, "milestone");
    assert.equal(dec.milestoneId, "day-7");
  });

  it("streak_risk fires only after 20:00 on the day after a visit", () => {
    const s = {
      ...emptyState("camille-laurent"),
      streak: { current: 4, best: 4, lastDay: "2026-05-09" },
      lastSeen: "2026-05-09T14:00:00Z",
    };
    const early = new Date(2026, 4, 10, 14, 0, 0);
    assert.notEqual(decideProactive(s, early).kind, "streak_risk");

    const late = new Date("2026-05-10T21:00:00");
    // Ensure yesterday matches s.streak.lastDay in UTC slice
    const sLate = {
      ...s,
      streak: { current: 4, best: 4, lastDay: new Date(late.getTime() - 86_400_000).toISOString().slice(0, 10) },
    };
    const dec = decideProactive(sLate, late);
    assert.equal(dec.should, true);
    assert.equal(dec.kind, "streak_risk");
  });

  it("absence needs 3 full days", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    mock.timers.enable({ apis: ["Date"], now });
    const twoDays = {
      ...emptyState("camille-laurent"),
      lastSeen: new Date("2026-05-08T13:00:00Z").toISOString(),
      streak: { current: 1, best: 1, lastDay: "2026-05-10" },
    };
    assert.equal(decideProactive(twoDays, now).should, false);

    const threeDays = {
      ...emptyState("camille-laurent"),
      lastSeen: new Date("2026-05-07T10:00:00Z").toISOString(),
    };
    const dec = decideProactive(threeDays, now);
    assert.equal(dec.should, true);
    assert.equal(dec.kind, "absence");
  });

  it("session_callback needs a session exactly one day old after 18:00", () => {
    const now = new Date(2026, 4, 10, 19, 0, 0);
    mock.timers.enable({ apis: ["Date"], now });
    const oneDayAgo = new Date(now.getTime() - 26 * 3_600_000).toISOString();
    const s = {
      ...emptyState("daisy-miller"),
      streak: { current: 2, best: 2, lastDay: now.toISOString().slice(0, 10) },
      lastSeen: now.toISOString(),
      milestones: ["first-session"],
      sessions: [
        {
          id: "s1",
          startedAt: oneDayAgo,
          durationSec: 600,
          edges: 3,
          tier: 2 as const,
        },
      ],
    };
    const dec = decideProactive(s, now);
    assert.equal(dec.should, true);
    assert.equal(dec.kind, "session_callback");
    assert.match(dec.line || "", /10 minutes/);
  });
});
