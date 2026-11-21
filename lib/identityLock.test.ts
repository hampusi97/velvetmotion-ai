import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FLAGSHIP_COMPANIONS } from "../data/companions";
import { hasIdentity, identityFragment, lockIdentity, seedFromId } from "./identityLock";

describe("identityLock", () => {
  it("seedFromId is stable across calls and differs per id", () => {
    assert.equal(seedFromId("camille-laurent"), seedFromId("camille-laurent"));
    assert.notEqual(seedFromId("camille-laurent"), seedFromId("yuki-sato"));
    assert.ok(seedFromId("daisy-miller") > 0);
  });

  it("resolves short-id aliases and all flagship companions", () => {
    assert.equal(hasIdentity("claire-beaumont"), true);
    assert.ok(identityFragment("claire-beaumont").includes("consistent facial structure"));
    for (const c of FLAGSHIP_COMPANIONS) {
      assert.equal(hasIdentity(c.id), true, `Expected flagship ${c.id} to resolve through hasIdentity`);
    }
  });

  it("lockIdentity prepends identity text and caller-supplied seed wins", () => {
    const locked = lockIdentity("editorial portrait at dusk", "camille-laurent", 777);
    assert.equal(locked.seed, 777);
    assert.ok(locked.prompt.startsWith(identityFragment("camille-laurent")));
    assert.ok(locked.prompt.endsWith("editorial portrait at dusk"));
  });

  it("unknown id leaves the prompt untouched", () => {
    const res = lockIdentity("sunset portrait", "unknown-id-xyz", 1234);
    assert.equal(res.prompt, "sunset portrait");
    assert.equal(res.seed, 1234);
    assert.equal(hasIdentity("unknown-id-xyz"), false);
  });
});
