import assert from "node:assert/strict";
import { FLAGSHIP_COMPANIONS } from "@/data/companions";
import { COMPANION_SESSION_THEMES, parseCompanionSessionTheme, recommendedCompanionThemes, THEMED_GUIDED_CUES } from "./companionSessionThemes";
import { test } from "node:test";
import { generateStudioVideoClip, type StudioVideoRequest } from "./canvasVideoExporter";
import {
  composeCompanionVideoPrompt,
  NEUTRAL_PORTRAIT_MOTION,
  validateCompanionVideoPrompt,
  VIDEO_SCENE_PRESETS,
} from "./companionVideoPrompt";
import { parseVideoSceneDraft, videoSceneDraftKey, type VideoSceneDraft } from "./videoSceneDraft";
import { buildGuidedSession } from "./guidedSession";
import { generateStudioPicture } from "./mediaGenerator";
import { LOCAL_COMFY_VIDEO_URL, localComfyVideoHealthUrl } from "./mediaSettings";
import { readChatEventStream } from "./chatStream";

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

test("each selectable mature roleplay theme has a playable companion script", () => {
  const companion = FLAGSHIP_COMPANIONS.find(({ id }) => id === "juno-aimes")!;
  for (const key of ["bnwo", "bnwo-sph", "bnwo-cheating", "bnwo-breeding", "cheating", "her-choice", "breeding", "sph"] as const) {
    assert.equal(parseCompanionSessionTheme(key), key);
    const session = buildGuidedSession(JSON.stringify(THEMED_GUIDED_CUES[key]), {
      name: companion.name, age: companion.age, summary: companion.tagline, voiceId: companion.voiceId,
    }, COMPANION_SESSION_THEMES[key].label, 2, "companion");
    assert.equal(session.steps.length, 3);
    assert.equal(session.steps.at(-1)?.phase, "finish");
    assert.equal(session.persona.voiceId, companion.voiceId);
  }
  assert.equal(parseCompanionSessionTheme("unknown"), null);
});

test("local video health probes use the configured loopback bridge", () => {
  assert.equal(localComfyVideoHealthUrl(LOCAL_COMFY_VIDEO_URL), "http://127.0.0.1:8787/video/health");
  assert.equal(localComfyVideoHealthUrl("http://localhost:9888/generate-video"), "http://localhost:9888/video/health");
  assert.equal(localComfyVideoHealthUrl("https://example.test/generate-video"), null);
  assert.equal(localComfyVideoHealthUrl("http://user@localhost:8787/generate-video"), null);
});

test("roleplay video scene presets require explicit adult mode", () => {
  for (const id of ["bnwo-secret-date", "sph-night-in", "bnwo-private-fantasy"]) {
    const preset = VIDEO_SCENE_PRESETS.find((scene) => scene.id === id);
    assert.ok(preset?.adult);
    const prompt = composeCompanionVideoPrompt(preset.scene, true, true);
    assert.equal(validateCompanionVideoPrompt(prompt, true), null);
    assert.match(validateCompanionVideoPrompt(prompt, false) ?? "", /Enable 18\+ mode/);
  }
});

test("chat previews survive split SSE events and hide reasoning as tokens arrive", async () => {
  const encoder = new TextEncoder();
  const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\r\n\r\n`;
  const prefix = encoder.encode(event("<thi") + event("nk>private plan") + event("</think>Play it again "));
  const suffix = encoder.encode(event("🎵") + "data: [DONE]\r\n\r\n");
  const emojiStart = suffix.indexOf(0xf0);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of [prefix.subarray(0, 12), prefix.subarray(12), suffix.subarray(0, emojiStart + 1), suffix.subarray(emojiStart + 1)]) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  const previews: string[] = [];
  const reply = await readChatEventStream(body, (preview) => previews.push(preview));
  assert.equal(reply, "<think>private plan</think>Play it again 🎵");
  assert.deepEqual(previews, ["", "", "Play it again ", "Play it again 🎵"]);
});

test("chat rejects a disconnected stream before a reply can be saved", async () => {
  const body = new Response('data: {"choices":[{"delta":{"content":"Partial reply"}}]}\n\n').body!;
  await assert.rejects(readChatEventStream(body), /ended before the provider completed/);
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

test("a scene draft round-trips render controls and omits image and provider fields", () => {
  const preset = VIDEO_SCENE_PRESETS.find(({ id }) => id === "silk-and-shadows");
  assert.ok(preset);
  const draft: VideoSceneDraft = {
    scene: preset.scene, adultMode: true, durationSec: 8,
    resolution: 1080, speed: 0.75, motionId: "balcony-breeze",
  };
  assert.deepEqual(parseVideoSceneDraft(JSON.stringify({
    ...draft, imageUrl: "data:image/png;base64,unused", providerToken: "unused",
  })), draft);
  assert.notEqual(videoSceneDraftKey("veda-kane"), videoSceneDraftKey("noor-mansour"));
  assert.equal(parseVideoSceneDraft(JSON.stringify({ ...draft, resolution: 0 })), null);
  assert.equal(parseVideoSceneDraft(JSON.stringify({ ...draft, scene: { ...draft.scene, action: 7 } })), null);
  assert.equal(parseVideoSceneDraft("unreadable state"), null);
});
