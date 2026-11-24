import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FLAGSHIP_COMPANIONS } from "../data/companions";
import { EFFECTS } from "../data/effects";
import { getGoonStats } from "./streaks";

describe("cross-brief contracts", () => {
  it("every companion has an id and name", () => {
    for (const c of FLAGSHIP_COMPANIONS) {
      assert.ok(c.id);
      assert.ok(c.name);
    }
  });

  it("effect slugs are unique and url-safe", () => {
    const slugs = EFFECTS.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const s of slugs) assert.match(s, /^[a-z0-9-]+$/);
  });

  it("effect SEO copy fits", () => {
    for (const e of EFFECTS) {
      assert.ok(e.title.length <= 60);
      assert.ok(e.description.length <= 155);
    }
  });

  it("GoonStats shape is intact", () => {
    const stats = getGoonStats();
    for (const k of ["streak", "totalMinutes", "sessions", "maxIntensity", "rankTitle"]) {
      assert.ok(k in stats);
    }
  });
});
