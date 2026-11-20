import assert from "node:assert/strict";
import { test } from "node:test";
import { generateStudioVideoClip, type StudioVideoRequest } from "./canvasVideoExporter";
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
