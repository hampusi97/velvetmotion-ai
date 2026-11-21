import test from "node:test";
import assert from "node:assert/strict";
import { ORIGINAL_STARTER_COMPANIONS } from "./originalStarterCompanions";
import { validateCharacterCompliance } from "./complianceFilter";
import { safeCompanionAvatarUrl } from "./avatarOptimize";

test("all starter companions are distinct fictional adults with independent personalities", () => {
  assert.equal(ORIGINAL_STARTER_COMPANIONS.length, 10);
  assert.equal(new Set(ORIGINAL_STARTER_COMPANIONS.map(x => x.id)).size, 10);
  assert.equal(new Set(ORIGINAL_STARTER_COMPANIONS.map(x => x.name)).size, 10);
  for (const c of ORIGINAL_STARTER_COMPANIONS) {
    assert.ok(c.age >= 21);
    assert.ok(c.name.length > 4);
    assert.ok(c.personality.length > 30);
    assert.ok(c.initialMessage.length > 30);
    assert.ok(c.figure.includes("adult"));
    assert.ok(c.avatar.startsWith("data:image/svg+xml;charset=utf-8,"));
    assert.deepEqual(validateCharacterCompliance({
      name: c.name, age: c.age, tagline: c.tagline,
      personality: c.personality, backstory: c.background, figure: c.figure,
    }), { ok: true });
  }
});
test("roster avatars accept only local raster media, not untrusted SVG or remote URLs", () => {
  assert.equal(safeCompanionAvatarUrl("data:image/png;base64,AQID"), "data:image/png;base64,AQID");
  assert.equal(safeCompanionAvatarUrl("/portraits/demo.webp"), "/portraits/demo.webp");
  assert.equal(safeCompanionAvatarUrl("data:image/svg+xml;base64,PHN2Zy8+"), null);
  assert.equal(safeCompanionAvatarUrl("https://tracker.example/avatar.jpg"), null);
  assert.equal(safeCompanionAvatarUrl("javascript:alert(1)"), null);
});
