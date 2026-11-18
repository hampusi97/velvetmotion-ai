import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialSuiteState,
  startSuiteSession,
  togglePauseSuite,
  triggerHotspotInteraction,
  stepPlayerMovement,
  cycleLightingPreset,
  resetSuiteSession,
} from "./penthouseSuiteLogic";

describe("3D Penthouse Suite Pure Logic", () => {
  it("starts in title phase and transitions to playing and paused", () => {
    const initial = createInitialSuiteState("maren", 40);
    assert.equal(initial.phase, "title");
    assert.equal(initial.intimacy, 40);

    const playing = startSuiteSession(initial);
    assert.equal(playing.phase, "playing");

    const paused = togglePauseSuite(playing);
    assert.equal(paused.phase, "paused");

    const resumed = togglePauseSuite(paused);
    assert.equal(resumed.phase, "playing");
  });

  it("increments intimacy and records visited hotspots until suite climax (victory)", () => {
    let state = startSuiteSession(createInitialSuiteState("maren", 30));

    state = triggerHotspotInteraction(state, "bed");
    assert.equal(state.visitedHotspots.includes("bed"), true);
    assert.equal(state.intimacy, 55);
    assert.equal(state.phase, "playing");

    state = triggerHotspotInteraction(state, "champagne");
    assert.equal(state.intimacy, 75);
    assert.equal(state.phase, "playing");

    state = triggerHotspotInteraction(state, "companion");
    assert.equal(state.intimacy, 100);
    assert.equal(state.phase, "victory");
  });

  it("clamps player movement inside penthouse bounds", () => {
    let state = startSuiteSession(createInitialSuiteState("maren", 40));
    for (let i = 0; i < 40; i++) {
      state = stepPlayerMovement(state, { forward: 1, strafe: 1, turn: 0 }, 0.1);
    }
    assert.ok(state.playerPos.x <= 4.5 && state.playerPos.x >= -4.5);
    assert.ok(state.playerPos.z <= 4.8 && state.playerPos.z >= -3.8);
  });

  it("cycles lighting presets and resets session state", () => {
    let state = startSuiteSession(createInitialSuiteState("maren", 50));
    assert.equal(state.lighting, "boudoir");
    state = cycleLightingPreset(state);
    assert.equal(state.lighting, "candlelight");

    const reset = resetSuiteSession(state, 45);
    assert.equal(reset.phase, "playing");
    assert.equal(reset.intimacy, 45);
    assert.equal(reset.visitedHotspots.length, 0);
  });
});
