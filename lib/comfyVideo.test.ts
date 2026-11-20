import test from "node:test";
import assert from "node:assert/strict";
import { findComfyVideoOutput, prepareComfyVideoWorkflow, generateComfyVideo } from "./comfyVideo";

const workflow = JSON.stringify({
  "1": {class_type:"LoadImage",inputs:{image:"old.png"}},
  "2": {class_type:"CLIPTextEncode",inputs:{text:"old prompt"}},
  "3": {class_type:"VHS_VideoCombine",inputs:{frame_rate:12,images:["4",0]}},
});
test("updates only named source image and prompt input nodes", () => {
  const parsed = prepareComfyVideoWorkflow(workflow,"1","new.png","2","new prompt");
  assert.equal(parsed["1"].inputs.image,"new.png");
  assert.equal(parsed["2"].inputs.text,"new prompt");
  assert.equal(parsed["3"].class_type,"VHS_VideoCombine");
  assert.equal(JSON.parse(workflow)["1"].inputs.image,"old.png");
});
test("rejects visual-workflow export and mismatched or dangerous node IDs", () => {
  assert.throws(()=>prepareComfyVideoWorkflow('{"nodes":[]}',"1","test.png",undefined,"prompt"),/API format/);
  assert.throws(()=>prepareComfyVideoWorkflow(workflow,"2","test.png",undefined,"prompt"),/LoadImage/);
  assert.throws(()=>prepareComfyVideoWorkflow(workflow,"1","../outside.png",undefined,"prompt"),/unsafe/);
  assert.throws(()=>prepareComfyVideoWorkflow(workflow,"1","test.png","1","prompt"),/CLIPTextEncode/);
});
test("finds real video output from VideoHelperSuite history, never still images", () => {
  const history = { abc: {outputs:{"3":{gifs:[{filename:"video_0001.mp4",subfolder:"clips",type:"output"}],images:[{filename:"poster.png",type:"output"}]}}}};
  const url=findComfyVideoOutput(history,"abc","http://127.0.0.1:8188");
  assert.equal(new URL(url!).pathname,"/view");
  assert.equal(new URL(url!).searchParams.get("filename"),"video_0001.mp4");
  assert.equal(findComfyVideoOutput({abc:{outputs:{"3":{images:[{filename:"still.png"}]}}}},"abc","http://127.0.0.1:8188"),null);
});
test("uploads source image, queues a workflow and reports genuine video output", async () => {
  const old = globalThis.fetch;
  let queued: Record<string,unknown> | undefined;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url=String(input);
    calls.push(url);
    if (url==="data:image/png;base64,AQID") return new Response(new Uint8Array([1,2,3]),{headers:{"content-type":"image/png"}});
    if (url.endsWith("/upload/image")) {
      assert.equal(init?.method,"POST");
      assert.ok(init?.body instanceof FormData);
      return Response.json({name:"video-source.png"});
    }
    if (url.endsWith("/prompt")) {
      queued=JSON.parse(String(init?.body));
      return Response.json({prompt_id:"abc"});
    }
    if (url.endsWith("/history/abc")) {
      return Response.json({abc:{status:{status_str:"success"},outputs:{"8":{gifs:[{filename:"result.webm",type:"output"}]}}}});
    }
    throw new Error("Unexpected request "+url);
  };
  try {
    const result=await generateComfyVideo({
      baseUrl:"http://127.0.0.1:8188",workflowJson:workflow,imageNodeId:"1",promptNodeId:"2",prompt:"walk toward the camera",sourceImageUrl:"data:image/png;base64,AQID",
    });
    assert.equal(result.videoFormat,"webm");
    assert.equal(new URL(result.videoUrl).searchParams.get("filename"),"result.webm");
    assert.equal((queued!.prompt as Record<string,{inputs:Record<string,unknown>}> )["1"].inputs.image,"video-source.png");
    assert.equal(calls.length,4);
  } finally { globalThis.fetch=old; }
});
test("does not upload user images if video workflow validation fails", async () => {
  const old=globalThis.fetch;
  let called=false;
  globalThis.fetch=async()=>{ called=true; throw new Error("Unwanted request");};
  try {
    await assert.rejects(()=>generateComfyVideo({baseUrl:"http://127.0.0.1:8188",workflowJson:"{}",imageNodeId:"1",sourceImageUrl:"data:image/png;base64,AQID",prompt:"test"}),/1–250 nodes/);
    assert.equal(called,false);
  } finally { globalThis.fetch=old; }
});

test("pre-canceled generation never uploads a user source image", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  controller.abort();
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("Should never fetch"); };
  try {
    await assert.rejects(() => generateComfyVideo({
      baseUrl:"http://127.0.0.1:8188",workflowJson:workflow,imageNodeId:"1",
      sourceImageUrl:"data:image/png;base64,AQID",prompt:"test",signal:controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === "AbortError");
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("canceling after a queued workflow stops client polling without pretending it canceled the GPU job", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith("data:image/")) return new Response(new Uint8Array([1,2,3]),{headers:{"content-type":"image/png"}});
    if (url.endsWith("/upload/image")) return Response.json({name:"source.png"});
    if (url.endsWith("/prompt")) {
      // The server has accepted the GPU task. Abort during the response.
      controller.abort();
      return Response.json({prompt_id:"queued123"});
    }
    throw new Error("Canceled operation should not poll Comfy history: "+url);
  };
  try {
    await assert.rejects(() => generateComfyVideo({
      baseUrl:"http://127.0.0.1:8188",workflowJson:workflow,imageNodeId:"1",
      sourceImageUrl:"data:image/png;base64,AQID",prompt:"test",signal:controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === "AbortError");
    assert.deepEqual(calls.map(url => new URL(url).pathname), [
      "image/png;base64,AQID", "/upload/image", "/prompt",
    ].map((v, i) => i === 0 ? "image/png;base64,AQID" : v));
  } finally { globalThis.fetch = originalFetch; }
});

test("canceling during video history polling exits without waiting for the entire job timeout", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let checks = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("data:image/")) return new Response(new Uint8Array([1,2,3]),{headers:{"content-type":"image/png"}});
    if (url.endsWith("/upload/image")) return Response.json({name:"source.png"});
    if (url.endsWith("/prompt")) return Response.json({prompt_id:"job123"});
    if (url.endsWith("/history/job123")) {
      checks++;
      controller.abort();
      return Response.json({});
    }
    throw new Error("Unexpected URL "+url);
  };
  try {
    await assert.rejects(() => generateComfyVideo({
      baseUrl:"http://127.0.0.1:8188",workflowJson:workflow,imageNodeId:"1",
      sourceImageUrl:"data:image/png;base64,AQID",prompt:"test",signal:controller.signal,
    }), (error: unknown) => error instanceof Error && error.name === "AbortError");
    assert.equal(checks, 1);
  } finally { globalThis.fetch = originalFetch; }
});
