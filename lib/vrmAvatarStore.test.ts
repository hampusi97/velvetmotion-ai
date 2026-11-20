import test from "node:test";
import assert from "node:assert/strict";
import { inspectVrmBytes, MAX_VRM_BYTES } from "./vrmAvatarStore";

function glb(json: object): ArrayBuffer {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const aligned = (text.length + 3) & ~3;
  const bytes = new Uint8Array(20 + aligned);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, aligned, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(text, 20);
  bytes.fill(0x20, 20 + text.length);
  return bytes.buffer;
}
test("accepts embedded VRM 0.x and 1.0 GLB metadata", () => {
  assert.equal(inspectVrmBytes(glb({ asset: { version:"2.0" }, extensionsUsed:["VRM"] })).version, 0);
  assert.equal(inspectVrmBytes(glb({ asset: { version:"2.0" }, extensions:{ VRMC_vrm: { specVersion:"1.0" } } })).version, 1);
});
test("rejects glb without VRM extension or invalid GLB header", () => {
  assert.throws(() => inspectVrmBytes(glb({asset:{version:"2.0"}})), /not a VRM avatar/);
  assert.throws(() => inspectVrmBytes(new ArrayBuffer(12)), /GLB header/);
  const bad = glb({extensionsUsed:["VRM"]});
  new DataView(bad).setUint32(8, 9999, true);
  assert.throws(() => inspectVrmBytes(bad), /Invalid GLB\/VRM header/);
});
test("blocks VRM models that reference external textures or geometry", () => {
  assert.throws(() => inspectVrmBytes(glb({extensionsUsed:["VRMC_vrm"],images:[{uri:"https://other.site/tracker.png"}]})), /external URLs/);
  assert.throws(() => inspectVrmBytes(glb({extensionsUsed:["VRM"],buffers:[{uri:"../other.bin"}]})), /external URLs/);
  assert.ok(MAX_VRM_BYTES >= 50_000_000);
});
