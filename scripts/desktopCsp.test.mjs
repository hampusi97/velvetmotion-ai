import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Tauri permits only the expected local ComfyUI media source", () => {
  const cfg = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const csp = cfg.app?.security?.csp;
  assert.equal(typeof csp, "string");
  const media = csp.split(";").map(s=>s.trim()).find(s=>s.startsWith("media-src ")) || "";
  const connect = csp.split(";").map(s=>s.trim()).find(s=>s.startsWith("connect-src ")) || "";
  assert.ok(media.includes("http://127.0.0.1:8188"), "video playback needs local :8188 in media-src");
  assert.ok(connect.split(/\s+/).some(source => ["http://127.0.0.1:8188", "http://127.0.0.1:*"].includes(source)), "video workflow API needs local :8188 in connect-src");
  assert.ok(!media.split(/\s+/).includes("http:"), "never open media-src to every insecure HTTP origin");
  assert.ok(!media.includes("unsafe-eval"), "media-src should not permit executable code");
});
