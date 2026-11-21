import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getGoonStats } from "./streaks";

describe("streaks shim", () => {
  it("getGoonStats returns every key of GoonStats for an empty store", () => {
    const stats = getGoonStats();
    assert.equal(typeof stats.streak, "number");
    assert.equal(typeof stats.totalMinutes, "number");
    assert.equal(typeof stats.sessions, "number");
    assert.equal(typeof stats.maxIntensity, "number");
    assert.equal(typeof stats.rankTitle, "string");
    assert.ok(stats.rankTitle.length > 0);
  });
});
