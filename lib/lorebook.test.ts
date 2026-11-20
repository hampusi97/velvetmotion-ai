import test from "node:test";
import assert from "node:assert/strict";
import { parseCharacterLorebook, buildLorebookContext, normalizeLorebook } from "./lorebook";

test("reads nested V3 lorebook, drops disabled and empty entries", () => {
  const entries = parseCharacterLorebook({ spec: "chara_card_v3", data: { character_book: { entries: [
    { id: 1, keys: ["Library"], content: "The companion studies ancient books.", enabled: true },
    { id: 2, keys: ["no"], content: "Do not include.", enabled: false },
    { id: 3, keys: [], content: "Always there", constant: true },
    { id: 4, keys: [], content: "Should not appear" },
  ] } } });
  assert.equal(entries.length, 2);
  assert.ok(buildLorebookContext(entries, "Let's visit the LIBRARY").includes("ancient books"));
  assert.ok(buildLorebookContext(entries, "hello").includes("Always there"));
  assert.ok(!buildLorebookContext(entries, "hello").includes("ancient books"));
});
test("caps oversized lore entries and safely ignores malformed entries", () => {
  const entries = normalizeLorebook([{ key: ["test"], content: "A".repeat(5000) }, null, { content: "" }]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].content.length, 1200);
});
