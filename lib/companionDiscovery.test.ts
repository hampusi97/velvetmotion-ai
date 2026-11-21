import test from "node:test";
import assert from "node:assert/strict";
import { ORIGINAL_STARTER_COMPANIONS as cast } from "./originalStarterCompanions";
import {
  DEFAULT_COMPANION_LIBRARY_FILTERS,
  MAX_COMPANION_QUERY_LENGTH,
  discoverCompanions,
  discoveryFor,
  readCompanionLibraryFilters,
  writeCompanionLibraryFilters,
} from "./companionDiscovery";

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

test("library links normalize catalog values and keep unrelated URL parameters", () => {
  const params = new URLSearchParams("q=jazz+%26+books&category=sweetheart&tag=warm&interest=music&conversation=creative&style=anime&saved=1&sort=name&campaign=autumn");
  const options = { categories: ["All", "Sweetheart"], tags: ["Warm"], interests: ["Music"] };
  const filters = readCompanionLibraryFilters(params, options);
  assert.deepEqual(filters, {
    query: "jazz & books",
    category: "Sweetheart",
    tag: "Warm",
    interest: "Music",
    conversation: "Creative",
    visualStyle: "Anime",
    savedOnly: true,
    sort: "name",
  });
  writeCompanionLibraryFilters(params, filters);
  assert.equal(params.get("category"), "Sweetheart");
  assert.equal(params.get("campaign"), "autumn");
  assert.deepEqual(readCompanionLibraryFilters(params, options), filters);
});

test("library links bound query length and omit invalid and default facets", () => {
  const params = new URLSearchParams("category=missing&tag=missing&interest=missing&conversation=missing&style=missing&saved=true&sort=featured");
  const options = { categories: ["All", "Sweetheart"], tags: ["Warm"], interests: ["Music"] };
  assert.deepEqual(readCompanionLibraryFilters(params, options), DEFAULT_COMPANION_LIBRARY_FILTERS);
  params.set("q", "a".repeat(MAX_COMPANION_QUERY_LENGTH + 5));
  const filters = readCompanionLibraryFilters(params, options);
  assert.equal(filters.query.length, MAX_COMPANION_QUERY_LENGTH);
  writeCompanionLibraryFilters(params, filters);
  assert.deepEqual([...params.keys()], ["q"]);
});
