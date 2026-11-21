import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { consume } from "./photoBudget";
import { maybeUnpromptedPhoto } from "./unpromptedPhoto";

afterEach(() => {
  mock.timers.reset();
});

describe("unpromptedPhoto", () => {
  it("returns null when the daily budget is spent", async () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-10T12:00:00Z") });
    const companion = { id: "yuki-budget-exhausted", visualDna: "25-year-old Japanese woman" };
    assert.equal(consume(companion.id), true);
    assert.equal(consume(companion.id), true);

    let called = false;
    const url = await maybeUnpromptedPhoto(companion, "milestone", async () => {
      called = true;
      return { imageUrl: "data:image/jpeg;base64,AA==", engine: "test", seed: 1, elapsedSec: 0.1 };
    });
    assert.equal(url, null);
    assert.equal(called, false);
  });

  it("swallows a generator throw and returns null", async () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-11T12:00:00Z") });
    const companion = { id: "daisy-throw-test", visualDna: "23-year-old American woman" };
    const url = await maybeUnpromptedPhoto(companion, "evening", async () => {
      throw new Error("generator offline");
    });
    assert.equal(url, null);
  });
});
