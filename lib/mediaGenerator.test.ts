import test from "node:test";
import assert from "node:assert/strict";
import { generateStudioPicture } from "./mediaGenerator";

const tinyImage = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test("successful Cloudflare generation returns actual image bytes and an engine name", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(tinyImage, {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  });
  try {
    const result = await generateStudioPicture({
      prompt: "fictional adult portrait, morning sunlight",
      width: 512,
      height: 512,
      seed: 12,
    });
    assert.equal(result.engine, "Cloudflare Flux");
    assert.match(result.imageUrl, /^data:image\/jpeg;base64,/);
    assert.equal(result.seed, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auto-discovered ComfyUI works without a manually configured backend and selects an installed model", async () => {
  const originalFetch = globalThis.fetch;
  let submittedCheckpoint = "";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/system_stats")) return Response.json({ system: {} });
    if (url.endsWith("/object_info/CheckpointLoaderSimple")) {
      return Response.json({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [["my-installed-model.safetensors"]] } } } });
    }
    if (url.endsWith("/prompt")) {
      const body = JSON.parse(String(init?.body)) as { prompt: Record<string, { inputs?: { ckpt_name?: string } }> };
      submittedCheckpoint = body.prompt["4"].inputs?.ckpt_name || "";
      return Response.json({ prompt_id: "job1" });
    }
    if (url.includes("/history/job1")) {
      return Response.json({ job1: { outputs: { "9": { images: [{ filename: "generated.png" }] } } } });
    }
    if (url.includes("/view?")) {
      return new Response(tinyImage, { headers: { "content-type": "image/png" } });
    }
    throw new Error("Unexpected network call: " + url);
  };
  try {
    const result = await generateStudioPicture({
      prompt: "fictional adult cinematic portrait",
      width: 512,
      height: 768,
      seed: 42,
      localEngine: { comfyOnline: true, koboldOnline: false },
    });
    assert.equal(submittedCheckpoint, "my-installed-model.safetensors");
    assert.match(result.engine, /ComfyUI/);
    assert.match(result.imageUrl, /^data:image\/png;base64,/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("all providers failing returns a useful error, not a simulated picture", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("velvetmotion-image")) {
      return new Response("quota exceeded", { status: 429 });
    }
    if (url.includes("aihorde.net")) {
      return new Response("temporarily unavailable", { status: 503 });
    }
    throw new Error("Unexpected network call");
  };
  try {
    await assert.rejects(
      generateStudioPicture({ prompt: "fictional adult landscape portrait", width: 512, height: 512 }),
      /No image was generated.*Cloudflare.*AI Horde/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
