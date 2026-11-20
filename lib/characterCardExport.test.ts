import test from "node:test";
import assert from "node:assert/strict";
import { exportCharacterCard } from "./characterCardExport";
import { parseSillyTavernCard } from "./sillyTavernImport";
import { parseCharacterLorebook, type LorebookEntry } from "./lorebook";
import { ORIGINAL_STARTER_COMPANIONS } from "./originalStarterCompanions";

const lore: LorebookEntry[] = [
  {
    id: "7",
    keys: ["gallery"],
    content: "The fictional gallery opens late.",
    enabled: true,
    constant: false,
    order: 42,
  },
];
for (const version of ["v2", "v3"] as const) {
  test(`${version} JSON includes required card fields and round-trips age, voice, appearance, traits and lore order`, () => {
    const c = {
      ...ORIGINAL_STARTER_COMPANIONS[0],
      avatar: "data:image/png;base64,AQID",
    };
    const exported = exportCharacterCard(c, version, lore);
    for (const key of [
      "mes_example",
      "creator_notes",
      "system_prompt",
      "post_history_instructions",
      "creator",
      "character_version",
    ])
      assert.equal(typeof exported.data[key], "string");
    assert.ok(Array.isArray(exported.data.alternate_greetings));
    if (version === "v3")
      assert.ok(Array.isArray(exported.data.group_only_greetings));
    const restored = parseSillyTavernCard(JSON.parse(JSON.stringify(exported)));
    assert.ok(restored);
    assert.equal(restored.age, c.age);
    assert.equal(restored.name, c.name);
    assert.equal(restored.personality, c.personality);
    assert.equal(restored.initialMessage, c.initialMessage);
    assert.equal(restored.visualDna, c.visualDna);
    assert.equal(restored.voiceId, c.voiceId);
    assert.deepEqual(restored.voice, c.voice);
    assert.equal(restored.avatar, c.avatar);
    assert.deepEqual(restored.discovery, c.discovery);
    assert.equal(parseCharacterLorebook(exported)[0].order, 42);
    assert.ok(!JSON.stringify(exported).includes("vm-chat"));
  });
}
test("unknown extensions and alternate greetings survive an import-edit-export cycle", () => {
  const raw = exportCharacterCard(ORIGINAL_STARTER_COMPANIONS[0], "v3", lore);
  raw.data.extensions = {
    ...(raw.data.extensions as object),
    custom_client: { color: "violet" },
  };
  raw.data.alternate_greetings = ["Another scene."];
  const c = parseSillyTavernCard(raw)!;
  const again = exportCharacterCard(
    { ...c, name: "Edited fictional companion" },
    "v3",
    parseCharacterLorebook(raw),
  );
  assert.deepEqual(
    (again.data.extensions as Record<string, unknown>).custom_client,
    { color: "violet" },
  );
  assert.deepEqual(again.data.alternate_greetings, ["Another scene."]);
  assert.equal(again.data.name, "Edited fictional companion");
});
test("malformed fields, unsafe extension data and non-adult exports are rejected", () => {
  assert.equal(parseSillyTavernCard({ data: { name: { bad: true } } }), null);
  assert.equal(
    parseSillyTavernCard({
      data: {
        name: "Adult test",
        description: "Adult original",
        extensions: { velvetmotion: { age: 28, visualDna: "17 years old" } },
      },
    }),
    null,
  );
  assert.throws(() =>
    exportCharacterCard({ ...ORIGINAL_STARTER_COMPANIONS[0], age: 16 }, "v3"),
  );
});
