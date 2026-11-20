import assert from "node:assert/strict";
import { FLAGSHIP_COMPANIONS } from "@/data/companions";
import { COMPANION_SESSION_THEMES, recommendedCompanionThemes } from "./companionSessionThemes";
import { test } from "node:test";
import { generateStudioVideoClip, type StudioVideoRequest } from "./canvasVideoExporter";
import {
  composeCompanionVideoPrompt,
  NEUTRAL_PORTRAIT_MOTION,
  validateCompanionVideoPrompt,
  VIDEO_SCENE_PRESETS,
} from "./companionVideoPrompt";
import { buildGuidedSession } from "./guidedSession";
import { generateStudioPicture } from "./mediaGenerator";

const videoRequest: StudioVideoRequest = {
  mode: "ai",
  imageUrl: "https://example.test/portrait.png",
  motionId: "balcony-breeze",
  durationSec: 5,
  speed: 1,
  resolution: 1080,
  sourceType: "fictional",
  adultMode: true,
  videoBackendUrl: "https://example.test/render",
};

test("AI video keeps source classification and resolution across a queued render", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async (target: URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      assert.equal(String(target), "https://example.test/render");
      const request = JSON.parse(String(init.body));
      assert.equal(request.resolution, 1080);
      assert.equal(request.adultMode, true);
      assert.equal(request.sourceType, "fictional");
      return new Response(null, { status: 202, headers: { location: "/jobs/123", "retry-after": "1" } });
    }
    assert.equal(String(target), "https://example.test/jobs/123");
    return Response.json({ videoUrl: "https://cdn.example.test/output.mp4" });
  });
  const result = await generateStudioVideoClip(videoRequest);
  assert.equal(result.isGenerative, true);
  assert.equal(result.videoFormat, "mp4");
  assert.equal(fetcher.mock.callCount(), 2);
});

test("AI video reports errors rather than returning an animated still", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(generateStudioVideoClip(videoRequest), /HTTP 503/);
  await assert.rejects(generateStudioVideoClip({ ...videoRequest, videoBackendUrl: "" }), /Configure an image-to-video workflow/);
  await assert.rejects(generateStudioVideoClip({ ...videoRequest, sourceType: "real-person" }), /fictional adult artwork/);
  assert.equal(fetcher.mock.callCount(), 1);
});

test("AI video rejects cross-origin job polling", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ statusUrl: "https://other.example.test/job" }, { status: 202 }));
  await assert.rejects(generateStudioVideoClip(videoRequest), /same-origin job status URL/);
  assert.equal(fetcher.mock.callCount(), 1);
});

test("High-detail pictures keep the request local when no image model is reachable", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request"); });
  await assert.rejects(generateStudioPicture({
    prompt: "A fictional adult editorial portrait",
    width: 960,
    height: 1440,
    requireLocal: true,
  }), /local image model could not finish/);
  assert.equal(fetcher.mock.callCount(), 0);
});

test("JOI drafts map model cues to the selected session length", () => {
  const persona = { name: "Fictional companion", age: 25, summary: "Playful" };
  const session = buildGuidedSession('["Start slowly.", "Keep a steady pace.", "Take a breath."]', persona, "gentle", 4);
  assert.deepEqual(session.steps.map((step) => step.suggestedSeconds), [60, 120, 60]);
  assert.throws(() => buildGuidedSession('["One cue"]', persona, "gentle", 4), /three usable cues/);
  assert.throws(() => buildGuidedSession('["Start slowly.", "Use a deepfake.", "Take a breath."]', persona, "gentle", 4), /strictly prohibited/);
});

test("18+ video presets produce an editable fictional prompt and require 18+ mode", () => {
  const preset = VIDEO_SCENE_PRESETS.find(({ id }) => id === "after-hours");
  assert.ok(preset);
  const prompt = composeCompanionVideoPrompt({ ...preset.scene, camera: "locked tripod" }, true, true);
  assert.match(prompt, /Camera: locked tripod/);
  assert.match(prompt, /Setting: a private boudoir suite/);
  assert.equal(validateCompanionVideoPrompt(prompt, true), null);
  assert.match(validateCompanionVideoPrompt(prompt, false) ?? "", /Enable 18\+ mode/);
  assert.equal(composeCompanionVideoPrompt(preset.scene, false, true), NEUTRAL_PORTRAIT_MOTION);
  assert.match(validateCompanionVideoPrompt("A celebrity nude video", true) ?? "", /strictly prohibited/);
});

test("a fully filled scene fits the local video bridge", () => {
  const prompt = composeCompanionVideoPrompt({
    action: "a".repeat(800),
    setting: "b".repeat(200),
    camera: "c".repeat(200),
    lighting: "d".repeat(200),
  }, true, true);
  assert.ok(prompt.length <= 600);
});

test("every flagship adult has a mature photo preset and three playable guided cues", () => {
  for (const profile of FLAGSHIP_COMPANIONS) {
    assert.ok(profile.age >= 21, profile.id);
    assert.ok(profile.sceneSelfiePresets.some((scene) => scene.nsfw), profile.id);
    assert.ok(recommendedCompanionThemes(profile.category).every((theme) => COMPANION_SESSION_THEMES[theme]), profile.id);
    const session = buildGuidedSession(JSON.stringify(profile.guidedPaceStages), {
      name: profile.name,
      age: profile.age,
      summary: profile.tagline,
      voiceId: profile.voiceId,
    }, "gentle", 4, "companion");
    assert.equal(session.steps.length, 3, profile.id);
    assert.equal(session.persona.voiceId, profile.voiceId, profile.id);
    assert.equal(session.summary, "4-minute companion script", profile.id);
  }
});
