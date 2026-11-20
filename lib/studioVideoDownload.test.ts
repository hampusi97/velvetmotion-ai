import test from "node:test";
import assert from "node:assert/strict";
import { MAX_STUDIO_VIDEO_DOWNLOAD, fetchStudioVideoBlob, validateStudioVideoUrl } from "./studioVideoDownload";

test("accepts HTTPS clips, local ComfyUI and browser blob URLs", () => {
  assert.equal(validateStudioVideoUrl("https://video.example.test/short.mp4").protocol, "https:");
  assert.equal(validateStudioVideoUrl("http://127.0.0.1:8188/view?filename=clip.mp4").port, "8188");
  assert.equal(validateStudioVideoUrl("blob:https://example.test/123").protocol, "blob:");
});
test("blocks insecure remote, credentialed, and nonvideo data URLs", () => {
  assert.throws(() => validateStudioVideoUrl("http://public.example/video.mp4"), /Insecure/);
  assert.throws(() => validateStudioVideoUrl("https://alice:secret@example.test/video.mp4"), /credentials/);
  assert.throws(() => validateStudioVideoUrl("javascript:alert(1)"), /Unsupported/);
  assert.throws(() => validateStudioVideoUrl("data:text/html;base64,PGgxPg=="), /Only MP4/);
});

test("downloads a real ComfyUI MP4 response without following the browser cross-origin download attribute", async () => {
  let actualUrl = "";
  const fetcher = (async (input: RequestInfo | URL) => {
    actualUrl = String(input);
    return new Response(new Uint8Array([0,0,0,24,102,116,121,112]),{
      headers:{"content-type":"video/mp4","content-length":"8"},
    });
  }) as typeof fetch;
  const source = "http://127.0.0.1:8188/view?filename=clip.mp4&type=output";
  const blob = await fetchStudioVideoBlob(source, fetcher);
  assert.equal(actualUrl,source);
  assert.equal(blob.size,8);
});
test("rejects HTML error pages pretending to be video clips", async () => {
  const fake = (async () => new Response("<html>Not found</html>", {
    headers:{"content-type":"text/html"},
  })) as typeof fetch;
  await assert.rejects(fetchStudioVideoBlob("https://video.example.test/clip.mp4",fake),/instead of a playable clip/);
});
test("rejects empty videos and oversized bodies", async () => {
  const empty = (async () => new Response(new Uint8Array(), {
    headers:{"content-type":"video/mp4"},
  })) as typeof fetch;
  await assert.rejects(fetchStudioVideoBlob("https://video.example.test/clip.mp4",empty),/empty/);
  const oversized = (async () => new Response(new Uint8Array([1]), {
    headers:{"content-type":"video/webm","content-length":String(MAX_STUDIO_VIDEO_DOWNLOAD+1)},
  })) as typeof fetch;
  await assert.rejects(fetchStudioVideoBlob("https://video.example.test/clip.webm",oversized),/250 MB/);
});
