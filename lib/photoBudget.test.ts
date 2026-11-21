import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { consume, remaining } from "./photoBudget";

afterEach(() => {
  mock.timers.reset();
});

describe("photoBudget", () => {
  it("allows two consumptions per day, fails the third, and resets on a new day", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-01T10:00:00Z") });
    const id = "camille-budget-test";
    assert.equal(remaining(id), 2);
    assert.equal(consume(id), true);
    assert.equal(remaining(id), 1);
    assert.equal(consume(id), true);
    assert.equal(remaining(id), 0);
    assert.equal(consume(id), false);

    mock.timers.setTime(new Date("2026-06-02T10:00:00Z").getTime());
    assert.equal(remaining(id), 2);
    assert.equal(consume(id), true);
  });
});
