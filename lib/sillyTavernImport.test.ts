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

test("keeps distinct cards with the same name from sharing a storage ID", () => {
  const a = parseSillyTavernCard({ name: "Alex", personality: "Loves philosophy", first_mes: "Hello" });
  const b = parseSillyTavernCard({ name: "Alex", personality: "Enjoys astronomy", first_mes: "Hello" });
  const again = parseSillyTavernCard({ name: "Alex", personality: "Loves philosophy", first_mes: "Hello" });
  assert.ok(a && b && again);
  assert.notEqual(a.id, b.id);
  assert.equal(a.id, again.id);
});
