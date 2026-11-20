import test from "node:test";
import assert from "node:assert/strict";
import { parseSillyTavernCard } from "./sillyTavernImport";

test("rejects missing names and explicitly underage cards", () => {
  assert.equal(parseSillyTavernCard({ data: { personality: "Friendly" } }), null);
  assert.equal(parseSillyTavernCard({ data: { name: "Test", personality: "17 years old" } }), null);
  assert.equal(parseSillyTavernCard({ data: { name: "Test", extensions: { velvetmotion: { age: 16 } } } }), null);
});
test("preserves a declared adult age", () => {
  const result = parseSillyTavernCard({ data: { name: "Test", extensions: { velvetmotion: { age: 19 } } } });
  assert.equal(result?.age, 19);
});
