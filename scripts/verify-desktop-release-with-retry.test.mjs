import test from "node:test";
import assert from "node:assert/strict";
import { verifyReleaseEventually } from "./verify-desktop-release-with-retry.mjs";

const tag = "v1.0.35";
const assets = [
  "VelvetMotion AI_1.0.35_aarch64.dmg",
  "VelvetMotion AI_1.0.35_x64.dmg",
  "VelvetMotion AI_1.0.35_amd64.AppImage",
  "VelvetMotion AI_1.0.35_x64-setup.exe",
];

test("retries release-asset propagation after all build jobs finish", async () => {
  let reads = 0;
  let waits = 0;
  const outcome = await verifyReleaseEventually({
    tag, signed: false, attempts: 3, delayMs: 0, log: () => {},
    wait: async () => { waits++; },
    loadAssets: async () => ++reads === 1 ? assets.slice(0,3) : assets,
  });
  assert.equal(outcome.attempt,2);
  assert.equal(waits,1);
});

test("fails closed rather than publishing a draft with a missing Windows installer", async () => {
  let waits = 0;
  await assert.rejects(() => verifyReleaseEventually({
    tag, signed:false, attempts:3, delayMs:0, log:()=>{},
    wait:async()=>{waits++;},
    loadAssets:async()=>assets.slice(0,3),
  }), /Refusing to publish incomplete desktop release.*Windows x64/);
  assert.equal(waits,2);
});

test("signed releases wait for complete matching latest.json, not merely installers", async () => {
  const prefix = `https://github.com/hampusi97/velvetmotion-ai/releases/download/${tag}/`;
  const signature = "a".repeat(96);
  const valid = {version:"1.0.35",platforms:{
    "windows-x86_64":{url:prefix+assets[3],signature},
    "darwin-aarch64":{url:prefix+assets[0],signature},
    "darwin-x86_64":{url:prefix+assets[1],signature},
    "linux-x86_64":{url:prefix+assets[2],signature},
  }};
  let reads = 0;
  const outcome = await verifyReleaseEventually({
    tag,signed:true,attempts:3,delayMs:0,log:()=>{},wait:async()=>{},
    loadAssets:async()=>[...assets,"latest.json"],
    loadManifest:async()=>++reads === 1 ? {...valid,version:"1.0.34"} : valid,
  });
  assert.equal(outcome.attempt,2);
});

test("never accepts stale or invalid signed release manifest after retry deadline", async () => {
  await assert.rejects(() => verifyReleaseEventually({
    tag,signed:true,attempts:2,delayMs:0,log:()=>{},wait:async()=>{},
    loadAssets:async()=>[...assets,"latest.json"],
    loadManifest:async()=>({version:"1.0.35",platforms:{}}),
  }),/Missing signed updater platform/);
});

test("does not hide release API errors and retries transient failures", async () => {
  let tries=0;
  const result=await verifyReleaseEventually({
    tag,signed:false,attempts:2,delayMs:0,log:()=>{},wait:async()=>{},
    loadAssets:async()=>{if(++tries===1)throw new Error("HTTP 502");return assets;},
  });
  assert.equal(result.attempt,2);
});

test("bounds retries so an incomplete release cannot block the publishing workflow indefinitely", async () => {
  await assert.rejects(()=>verifyReleaseEventually({
    tag,signed:false,attempts:31,loadAssets:async()=>assets,
  }),/between 1 and 30/);
});
