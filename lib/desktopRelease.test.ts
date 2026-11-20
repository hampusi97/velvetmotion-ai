import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseDesktopInstaller, detectDesktopPlatform, humanFileSize,
  type ReleaseAsset,
} from "./desktopRelease";

const origin = "https://github.com/hampusi97/velvetmotion-ai/releases/download/v1.0.13/";
const assets: ReleaseAsset[] = [
  { name: "VelvetMotion.AI_1.0.13_x64-setup.exe", browser_download_url: origin + "VelvetMotion.AI_1.0.13_x64-setup.exe" },
  { name: "VelvetMotion.AI_1.0.13_x64_en-US.msi", browser_download_url: origin + "VelvetMotion.AI_1.0.13_x64_en-US.msi" },
  { name: "VelvetMotion.AI_1.0.13_aarch64.dmg", browser_download_url: origin + "VelvetMotion.AI_1.0.13_aarch64.dmg" },
  { name: "VelvetMotion.AI_1.0.13_x64.dmg", browser_download_url: origin + "VelvetMotion.AI_1.0.13_x64.dmg" },
  { name: "VelvetMotion.AI_1.0.13_amd64.AppImage", browser_download_url: origin + "VelvetMotion.AI_1.0.13_amd64.AppImage" },
];

test("selects only platform-correct installer types", () => {
  assert.match(chooseDesktopInstaller(assets, "windows")!.name, /setup.exe$/);
  assert.match(chooseDesktopInstaller(assets, "mac-arm")!.name, /aarch64.dmg$/);
  assert.match(chooseDesktopInstaller(assets, "mac-intel")!.name, /x64.dmg$/);
  assert.match(chooseDesktopInstaller(assets, "linux")!.name, /amd64.AppImage$/);
});
test("does not substitute wrong architecture for a Mac", () => {
  const intelOnly = assets.filter((a) => a.name.endsWith("_x64.dmg"));
  assert.equal(chooseDesktopInstaller(intelOnly, "mac-arm"), null);
});
test("refuses forged installer URLs from other websites and repositories", () => {
  const untrusted: ReleaseAsset[] = [
    { name: "VelvetMotion.AI_x64-setup.exe", browser_download_url: "https://evil.example/VelvetMotion.AI_x64-setup.exe" },
    { name: "VelvetMotion.AI_x64-setup.exe", browser_download_url: "https://github.com/someone/else/releases/download/v1/x.exe" },
  ];
  assert.equal(chooseDesktopInstaller(untrusted, "windows"), null);
});
test("operating system guessing never pretends to know Mac CPU architecture", () => {
  assert.equal(detectDesktopPlatform("Windows NT 10.0; Win64; x64"), "windows");
  assert.equal(detectDesktopPlatform("Macintosh; Intel Mac OS X"), "mac-arm"); // UI offers manual Intel selection.
  assert.equal(detectDesktopPlatform("X11; Linux x86_64"), "linux");
});
test("renders optional release file size", () => {
  assert.equal(humanFileSize(1024 * 1024 * 22), "22.0 MB");
  assert.equal(humanFileSize(undefined), "");
});
