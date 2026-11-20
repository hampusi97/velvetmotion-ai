import test from "node:test";
import assert from "node:assert/strict";
import { generateStudioVideoClip } from "./canvasVideoExporter";

test("uses a completed asynchronous video render from the configured provider", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url === "https://video.example.test/generate") {
      return Response.json({ state: "queued", statusUrl: "/jobs/123" }, { status: 202 });
    }
    if (url === "https://video.example.test/jobs/123") {
      return Response.json({ state: "completed", videoUrl: "https://video.example.test/clips/123.mp4" });
    }
    throw new Error("Unexpected network call: " + url);
  };
  try {
    const result = await generateStudioVideoClip({
      imageUrl: "https://images.example.test/fictional-portrait.jpg",
      motionId: "slow-zoom-blink",
      durationSec: 3,
      speed: 1,
      sourceType: "fictional",
      videoBackendUrl: "https://video.example.test/generate",
    });
    assert.equal(result.isGenerative, true);
    assert.equal(result.videoFormat, "mp4");
    assert.equal(result.videoUrl, "https://video.example.test/clips/123.mp4");
    assert.deepEqual(requests, [
      "https://video.example.test/generate",
      "https://video.example.test/jobs/123",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("resolves a relative video result URL against the configured provider", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ videoUrl: "/clips/generated.mp4" });
  try {
    const result = await generateStudioVideoClip({
      imageUrl: "https://images.example.test/original-art.jpg",
      motionId: "slow-zoom-blink",
      durationSec: 3,
      speed: 1,
      sourceType: "fictional",
      videoBackendUrl: "https://video.example.test/generate",
    });
    assert.equal(result.isGenerative, true);
    assert.equal(result.videoUrl, "https://video.example.test/clips/generated.mp4");
  } finally { globalThis.fetch = originalFetch; }
});
