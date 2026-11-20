import test from "node:test";
import assert from "node:assert/strict";
import { parseCardV2Json } from "./characterCardV2";

const card = (age: unknown) => JSON.stringify({
  spec: "chara_card_v2", spec_version: "2.0",
  data: { name: "Fictional Test", description: "Adult original character", personality: "Kind", scenario: "A night at the opera",
    first_mes: "Hello", tags: ["fictional"],
    extensions: { velvetmotion: { age } } },
});

test("rejects an underage imported character without coercing age", () => {
  const result = parseCardV2Json(card(16));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Underage ages/);
});
test("accepts a fictional adult card", () => {
  const result = parseCardV2Json(card(26));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.character.age, 26);
});
test("rejects invalid, nonfinite and fractional ages", () => {
  for (const age of [-2, 17, 17.5, "not-a-number", 125]) {
    assert.equal(parseCardV2Json(card(age)).ok, false, String(age));
  }
});
