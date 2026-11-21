import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  deny,
  empty,
  grant,
  load,
  mayGrant,
  minimumHours,
  relock,
  requestUnlock,
  setRawForTest,
} from "./chastity";

afterEach(() => {
  mock.timers.reset();
});

describe("chastity", () => {
  it("minimumHours doubles per denial and caps at 48", () => {
    let s = empty();
    assert.equal(minimumHours(s), 1);
    s = deny(s);
    assert.equal(minimumHours(s), 2);
    s = deny(s);
    assert.equal(minimumHours(s), 4);
    for (let i = 0; i < 10; i++) s = deny(s);
    assert.equal(minimumHours(s), 48);
  });

  it("mayGrant is false before the window and true after, and grant clears lockedAt", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-07-01T10:00:00Z") });
    let s = relock(deny(empty())); // 1 denial -> minimumHours = 2
    s = requestUnlock(s);
    assert.equal(mayGrant(s), false);

    mock.timers.setTime(new Date("2026-07-01T11:30:00Z").getTime());
    assert.equal(mayGrant(s), false);

    mock.timers.setTime(new Date("2026-07-01T12:01:00Z").getTime());
    assert.equal(mayGrant(s), true);

    const granted = grant(s);
    assert.equal(granted.locked, false);
    assert.equal(granted.lockedAt, undefined);
    assert.equal(granted.requests[0].granted, true);
  });

  it("corrupt storage loads as empty", () => {
    setRawForTest("corrupt-chastity-id", "{not-valid-json");
    assert.deepEqual(load("corrupt-chastity-id"), empty());
  });
});
