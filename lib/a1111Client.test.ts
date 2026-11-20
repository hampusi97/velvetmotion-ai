import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWebUiBase, normalizeA1111InputImage, parseA1111Checkpoints,
  discoverA1111Checkpoints, generateA1111Image,
} from "./a1111Client";

test("normalizes a local WebUI URL and rejects URL-embedded credentials", () => {
  assert.equal(normalizeWebUiBase("http://127.0.0.1:7860/sdapi/v1/txt2img"), "http://127.0.0.1:7860");
  assert.equal(normalizeWebUiBase("http://localhost:7860/"), "http://localhost:7860");
  assert.throws(() => normalizeWebUiBase("http://name:password@localhost:7860"), /without credentials/);
  assert.throws(() => normalizeWebUiBase("file:///tmp/test"), /HTTP/);
});
test("filters and deduplicates checkpoint names", () => {
  assert.deepEqual(parseA1111Checkpoints([
    { title: "sdxl-v1 [abc]", model_name: "sdxl-v1" }, null,
    { title: "sdxl-v1 [abc]" }, { title: "portrait [123]", model_name: "portrait" },
  ]), [{ title: "sdxl-v1 [abc]", modelName: "sdxl-v1" }, {title:"portrait [123]",modelName:"portrait"}]);
});
test("rejects remote URL sources for img2img", () => {
  assert.equal(normalizeA1111InputImage("data:image/png;base64,AQID"), "AQID");
  assert.throws(() => normalizeA1111InputImage("https://other.example/picture.jpg"), /base64/);
});
test("discovers WebUI checkpoints without changing the active checkpoint", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "http://127.0.0.1:7860/sdapi/v1/sd-models");
    return Response.json([{ title: "installed [123]", model_name: "installed" }]);
  };
  try {
    const result = await discoverA1111Checkpoints("http://127.0.0.1:7860");
    assert.equal(result.online, true);
    assert.equal(result.checkpoints[0].title, "installed [123]");
  } finally { globalThis.fetch = old; }
});
test("generates txt2img using a per-request checkpoint without editing global settings", async () => {
  const old = globalThis.fetch;
  let body: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://127.0.0.1:7860/sdapi/v1/txt2img");
    body = JSON.parse(String(init?.body));
    return Response.json({images:["AQID"]});
  };
  try {
    const result = await generateA1111Image({ baseUrl:"http://127.0.0.1:7860",prompt:"fictional scenic view",checkpoint:"installed [123]"});
    assert.equal(result.ok, true);
    assert.equal(result.imageUrl, "data:image/png;base64,AQID");
    assert.deepEqual(body.override_settings, { sd_model_checkpoint:"installed [123]" });
    assert.equal(body.override_settings_restore_afterwards, true);
    assert.equal(body.init_images, undefined);
  } finally { globalThis.fetch = old; }
});
test("img2img includes reference image and bounded denoise strength", async () => {
  const old = globalThis.fetch;
  let body: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://127.0.0.1:7860/sdapi/v1/img2img");
    body = JSON.parse(String(init?.body));
    return Response.json({images:["AQID"]});
  };
  try {
    const result = await generateA1111Image({ baseUrl:"http://127.0.0.1:7860",prompt:"alter background on fictional art",initImage:"data:image/png;base64,AQID",denoisingStrength:1.5});
    assert.equal(result.ok, true);
    assert.deepEqual(body.init_images, ["AQID"]);
    assert.equal(body.denoising_strength, 0.95);
  } finally { globalThis.fetch = old; }
});
test("failed WebUI responses report their actual error instead of generating a fake image", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => new Response("Model is not installed", {status:422});
  try {
    const result = await generateA1111Image({baseUrl:"http://127.0.0.1:7860",prompt:"an original adult character"});
    assert.equal(result.ok, false);
    assert.match(result.note, /HTTP 422.*not installed/);
  } finally { globalThis.fetch = old; }
});
