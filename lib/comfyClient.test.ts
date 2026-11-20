import test from "node:test";
import assert from "node:assert/strict";
import { buildComfyWorkflowGraph, tryComfyDirect } from "./comfyClient";

test("basic ComfyUI graph uses selected checkpoint without unavailable FaceID nodes", () => {
  const graph = buildComfyWorkflowGraph({ prompt: "portrait", seed: 15, checkpoint: "model.safetensors" });
  assert.deepEqual((graph["4"] as {inputs:{ckpt_name:string}}).inputs.ckpt_name, "model.safetensors");
  assert.equal(graph["10"], undefined);
  assert.equal(graph["11"], undefined);
  assert.throws(
    () => buildComfyWorkflowGraph({ prompt: "portrait", seed: 15, referenceImageBase64: "data:image/png;base64,AAAABBBBCCCCDDDD" }),
    /compatible, installed IP-Adapter workflow/,
  );
});

test("ComfyUI selected missing checkpoint gives a specific failure without queuing", async () => {
  const original = globalThis.fetch;
  let queued = false;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/system_stats")) return Response.json({});
    if (url.endsWith("/object_info/CheckpointLoaderSimple"))
      return Response.json({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [["installed.safetensors"]] } } } });
    if (url.endsWith("/prompt")) { queued = true; return Response.json({prompt_id:"should-not-run"}); }
    throw new Error("Unexpected fetch "+url);
  };
  try {
    const result = await tryComfyDirect("http://127.0.0.1:8188", { prompt: "portrait", seed: 1, checkpoint: "missing.safetensors" });
    assert.equal(result.ok, false);
    assert.match(result.note, /not installed/);
    assert.equal(queued, false);
  } finally { globalThis.fetch = original; }
});

test("ComfyUI 400 queue errors show the provider validation response", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/system_stats")) return Response.json({});
    if (url.endsWith("/object_info/CheckpointLoaderSimple"))
      return Response.json({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [["installed.safetensors"]] } } } });
    if (url.endsWith("/prompt")) return new Response("Invalid workflow model", {status:400});
    throw new Error("Unexpected fetch " + url);
  };
  try {
    const result = await tryComfyDirect("http://127.0.0.1:8188", { prompt: "portrait", seed: 1 });
    assert.equal(result.ok, false);
    assert.match(result.note, /HTTP 400: Invalid workflow model/);
  } finally { globalThis.fetch = original; }
});
