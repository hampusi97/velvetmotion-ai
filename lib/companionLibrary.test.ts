import test from "node:test";
import assert from "node:assert/strict";
import { ORIGINAL_STARTER_COMPANIONS } from "./originalStarterCompanions";
import { allCharacters, getCharacter } from "./characters";
import {
  loadSavedCompanions,
  saveCompanionCustomization,
  toggleFavoriteCompanion,
  loadFavoriteCompanions,
} from "./companionLibrary";

function storageFixture(t: { after: (fn: () => void) => void }) {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const values = new Map<string, string>();
  let blocked = false;
  const storage = {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("Quota exceeded");
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: new EventTarget(),
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldStorage)
      Object.defineProperty(globalThis, "localStorage", oldStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  return {
    values,
    block: () => {
      blocked = true;
    },
  };
}

test("all library surfaces include imports and both historical custom keys, preferring edits without duplicate IDs", (t) => {
  const { values } = storageFixture(t);
  const original = ORIGINAL_STARTER_COMPANIONS[0];
  values.set("vm-imported-cards", JSON.stringify([original]));
  values.set(
    "vm-custom-girls",
    JSON.stringify([ORIGINAL_STARTER_COMPANIONS[1]]),
  );
  saveCompanionCustomization({
    ...original,
    personality:
      "A thoughtful fictional adult who enjoys architectural history.",
  });
  assert.equal(loadSavedCompanions().length, 2);
  assert.equal(allCharacters().filter((c) => c.id === original.id).length, 1);
  assert.match(getCharacter(original.id)!.personality, /architectural history/);
  assert.equal(getCharacter(original.id)!.id, original.id);
});

test("bad records and damaged collections do not crash or hide valid imports", (t) => {
  const { values } = storageFixture(t);
  values.set("velvet-custom-girls", "not-json");
  values.set(
    "vm-custom-girls",
    JSON.stringify([
      { id: "bad", name: "broken" },
      { ...ORIGINAL_STARTER_COMPANIONS[0], age: 15 },
    ]),
  );
  values.set(
    "vm-imported-cards",
    JSON.stringify([ORIGINAL_STARTER_COMPANIONS[1]]),
  );
  assert.deepEqual(
    loadSavedCompanions().map((c) => c.id),
    [ORIGINAL_STARTER_COMPANIONS[1].id],
  );
  assert.throws(() =>
    saveCompanionCustomization(ORIGINAL_STARTER_COMPANIONS[0]),
  );
});

test("storage failure is reported without losing existing edits or favorites", (t) => {
  const { values, block } = storageFixture(t);
  saveCompanionCustomization(ORIGINAL_STARTER_COMPANIONS[0]);
  toggleFavoriteCompanion("original-vivienne");
  const previous = values.get("velvet-custom-girls");
  block();
  assert.throws(
    () => saveCompanionCustomization(ORIGINAL_STARTER_COMPANIONS[1]),
    /Quota/,
  );
  assert.throws(() => toggleFavoriteCompanion("original-cleo"), /Quota/);
  assert.equal(values.get("velvet-custom-girls"), previous);
  assert.deepEqual(loadFavoriteCompanions(), ["original-vivienne"]);
});

test("favorites are normalized and toggling twice restores the saved set", (t) => {
  const { values } = storageFixture(t);
  values.set("vm:favorite-companions", '["one","one",null,2]');
  assert.deepEqual(loadFavoriteCompanions(), ["one"]);
  toggleFavoriteCompanion("two");
  toggleFavoriteCompanion("two");
  assert.deepEqual(loadFavoriteCompanions(), ["one"]);
  assert.throws(() =>
    saveCompanionCustomization({ ...ORIGINAL_STARTER_COMPANIONS[0], age: 17 }),
  );
});
