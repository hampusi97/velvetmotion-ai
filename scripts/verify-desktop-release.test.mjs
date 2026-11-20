import test from "node:test";
import assert from "node:assert/strict";
import { verifyDesktopRelease } from "./verify-desktop-release.mjs";

const tag = "v1.0.15";
const prefix = "https://github.com/hampusi97/velvetmotion-ai/releases/download/" + tag + "/";
const assets = [
  "VelvetMotion.AI_1.0.15_x64-setup.exe",
  "VelvetMotion.AI_1.0.15_x64.dmg",
  "VelvetMotion.AI_1.0.15_aarch64.dmg",
  "VelvetMotion.AI_1.0.15_amd64.AppImage",
  "latest.json",
];
const signature = "a".repeat(96);
const signedManifest = {
  version: "1.0.15",
  platforms: Object.fromEntries(["windows-x86_64", "darwin-aarch64", "darwin-x86_64", "linux-x86_64"].map((p) =>
    [p, { signature, url: prefix + "signed-" + p + ".zip" }]
  )),
};

test("accepts all supported installers before publishing unsigned release", () => {
  assert.doesNotThrow(() => verifyDesktopRelease({ tag, assets, signed: false }));
});
test("rejects incomplete desktop release", () => {
  assert.throws(() => verifyDesktopRelease({ tag, assets: assets.filter((x) => !x.endsWith("aarch64.dmg")), signed: false }), /Mac Apple silicon/);
});
test("accepts verified complete signed manifest", () => {
  assert.doesNotThrow(() => verifyDesktopRelease({ tag, assets, signed: true, manifest: signedManifest }));
});
test("refuses incomplete or mis-versioned signed releases", () => {
  assert.throws(() => verifyDesktopRelease({ tag, assets, signed: true, manifest: { ...signedManifest, version: "1.0.14" } }), /does not match/);
  const platforms = { ...signedManifest.platforms };
  delete platforms["darwin-x86_64"];
  assert.throws(() => verifyDesktopRelease({ tag, assets, signed: true, manifest: { ...signedManifest, platforms } }), /darwin-x86_64/);
});
test("rejects forged release artifact URLs", () => {
  const platforms = { ...signedManifest.platforms, "windows-x86_64": { signature, url: "https://example.net/evil.exe" } };
  assert.throws(() => verifyDesktopRelease({ tag, assets, signed: true, manifest: { ...signedManifest, platforms } }), /Untrusted/);
});
