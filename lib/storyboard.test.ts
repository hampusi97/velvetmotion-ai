import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAtelierShotPrompt, DEFAULT_ATELIER_SHOTS, sanitizeAtelierShots, validateAtelierShot,
} from "./storyboard";

test("creates stable fictional adult shot instructions with desired composition", () => {
  const prompt = buildAtelierShotPrompt({
    characterName: "Maren", visualDna: "fictional woman with silver-streak hair",
    scene: "Penthouse", shot: DEFAULT_ATELIER_SHOTS[0], adultMode: true,
  });
  assert.match(prompt, /FICTIONAL consenting adult aged 21/);
  assert.match(prompt, /fictional woman with silver-streak hair/);
  assert.match(prompt, /Composition: establishing/);
  assert.match(prompt, /model permits/);
});
test("rejects invalid or oversized shot layouts and duplicate IDs", () => {
  assert.equal(validateAtelierShot(DEFAULT_ATELIER_SHOTS[0]), true);
  const changed = { ...DEFAULT_ATELIER_SHOTS[0], direction: "x".repeat(401) };
  assert.equal(validateAtelierShot(changed), false);
  assert.equal(sanitizeAtelierShots([DEFAULT_ATELIER_SHOTS[0], DEFAULT_ATELIER_SHOTS[0]]).length, 1);
  assert.equal(sanitizeAtelierShots(Array(15).fill({...DEFAULT_ATELIER_SHOTS[0], id: "x"})).length, 1);
});
test("invalid local import defaults without evaluating arbitrary data", () => {
  assert.equal(sanitizeAtelierShots({ shots: "bad" }).length, DEFAULT_ATELIER_SHOTS.length);
  assert.throws(() => buildAtelierShotPrompt({
    characterName: "x", visualDna: "", scene: "", shot: DEFAULT_ATELIER_SHOTS[0], adultMode: false,
  }), /valid fictional-character/);
});
