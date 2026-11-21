import test from "node:test";
import assert from "node:assert/strict";
import { ORIGINAL_STARTER_COMPANIONS as cast } from "./originalStarterCompanions";
import { discoverCompanions, discoveryFor } from "./companionDiscovery";

test("interest, conversation, personality, portrait style and favorites combine without mutating the roster", () => {
  const ids = cast.map((c) => c.id);
  const result = discoverCompanions([...cast], {
    interest: "Science",
    conversation: "Reflective",
    visualStyle: "Illustrated",
    savedOnly: true,
    favorites: ["original-noor", "original-rhea"],
  });
  assert.deepEqual(
    result.map((c) => c.id),
    ["original-noor"],
  );
  assert.equal(
    discoverCompanions([...cast], { interest: "Science", category: "Romantic" })
      .length,
    0,
  );
  discoverCompanions([...cast], { sort: "name" });
  assert.deepEqual(
    cast.map((c) => c.id),
    ids,
  );
});
test("search accepts multiple words across name, background and interests, and reset returns the complete cast", () => {
  assert.deepEqual(
    discoverCompanions([...cast], { query: "  NOOR   engineer Science " }).map(
      (c) => c.id,
    ),
    ["original-noor"],
  );
  assert.equal(discoverCompanions([...cast], { query: "zzzzz" }).length, 0);
  assert.equal(discoverCompanions([...cast], {}).length, cast.length);
});
test("older cards derive useful facets and invalid optional metadata stays bounded", () => {
  const old = {
    ...cast[0],
    discovery: undefined,
    figure: "photoreal adult portrait",
  };
  assert.ok(discoveryFor(old).interests.includes("Art"));
  assert.equal(discoveryFor(old).visualStyle, "Realistic");
  assert.ok(
    discoveryFor(old).conversationTypes.every(
      (value) => typeof value === "string",
    ),
  );
  const bad = {
    ...old,
    discovery: {
      interests: [null, "Art"],
      conversationTypes: [null, "Everyday"],
      visualStyle: "invalid",
    },
  };
  assert.doesNotThrow(() => discoveryFor(bad as never));
});
