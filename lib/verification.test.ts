import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifyPhoto } from "./verification";

const companion = {
  name: "Camille",
  personality: "Composed, exacting, quietly warm once you stop trying to impress her.",
};

describe("verification", () => {
  it("parses PASS and FAIL verdicts", async () => {
    const passRes = await verifyPhoto(
      companion,
      "data:image/jpeg;base64,AA==",
      "pussyfree",
      async () => "PASS\nGood. Keep it that way until Sunday.",
    );
    assert.equal(passRes.pass, true);
    assert.equal(passRes.line, "Good. Keep it that way until Sunday.");

    const failRes = await verifyPhoto(
      companion,
      "data:image/jpeg;base64,AA==",
      "locked",
      async () => "FAIL\nTry again with better lighting.",
    );
    assert.equal(failRes.pass, false);
    assert.equal(failRes.line, "Try again with better lighting.");
  });

  it("a malformed reply yields pass: null", async () => {
    const res = await verifyPhoto(
      companion,
      "data:image/jpeg;base64,AA==",
      "pussyfree",
      async () => "UNCLEAR\nHold the camera steady.",
    );
    assert.equal(res.pass, null);
    assert.equal(res.line, "Hold the camera steady.");
  });

  it("a thrown provider yields the fallback line", async () => {
    const res = await verifyPhoto(
      companion,
      "data:image/jpeg;base64,AA==",
      "pussyfree",
      async () => {
        throw new Error("network error");
      },
    );
    assert.equal(res.pass, null);
    assert.equal(res.line, "I can't see it properly. Tell me instead.");
  });
});
