/**
 * Fail closed before publishing a multi-platform desktop release.
 * A draft must have all installers. Signed releases must additionally have a
 * complete Tauri v2 latest.json manifest with signatures and official URLs.
 */
import fs from "node:fs";

const requiredInstallers = (version) => [
  { label: "Windows x64", test: (n) => n.endsWith(`_${version}_x64-setup.exe`) },
  { label: "Mac Apple silicon", test: (n) => n.endsWith(`_${version}_aarch64.dmg`) },
  { label: "Mac Intel", test: (n) => n.endsWith(`_${version}_x64.dmg`) },
  { label: "Linux x64", test: (n) => n.endsWith(`_${version}_amd64.AppImage`) },
];
const REQUIRED_SIGNED_PLATFORMS = ["windows-x86_64", "darwin-aarch64", "darwin-x86_64", "linux-x86_64"];

export function verifyDesktopRelease({ tag, assets, signed, manifest }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error("Invalid release tag");
  if (!Array.isArray(assets)) throw new Error("Release assets must be an array");
  for (const required of requiredInstallers(tag.slice(1))) {
    if (!assets.some((name) => typeof name === "string" && required.test(name))) {
      throw new Error(`Missing ${required.label} installer in draft release`);
    }
  }
  if (!signed) return;

  if (!manifest || typeof manifest !== "object" || !manifest.platforms) {
    throw new Error("Signed release missing latest.json platforms");
  }
  if (manifest.version !== tag.slice(1)) {
    throw new Error(`Signed manifest version ${manifest.version} does not match ${tag}`);
  }
  const platforms = manifest.platforms;
  for (const platform of REQUIRED_SIGNED_PLATFORMS) {
    const match = Object.entries(platforms).find(([name]) => name === platform || name.startsWith(platform + "-"));
    if (!match) throw new Error(`Missing signed updater platform ${platform}`);
    const metadata = match[1];
    if (!metadata || typeof metadata !== "object") throw new Error(`Invalid signed metadata for ${platform}`);
    if (typeof metadata.signature !== "string" || metadata.signature.length < 50) {
      throw new Error(`Missing valid-length signature for ${platform}`);
    }
    let url;
    try { url = new URL(metadata.url); } catch { throw new Error(`Invalid updater URL for ${platform}`); }
    if (url.protocol !== "https:" || url.hostname !== "github.com" ||
      !url.pathname.startsWith("/hampusi97/velvetmotion-ai/releases/download/" + tag + "/")) {
      throw new Error(`Untrusted signed updater URL for ${platform}`);
    }
    const filename = decodeURIComponent(url.pathname.split("/").at(-1) || "");
    if (!assets.includes(filename)) {
      throw new Error(`Signed updater for ${platform} references a missing release asset: ${filename}`);
    }
  }
  if (!assets.includes("latest.json")) throw new Error("Signed release missing latest.json asset");
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const [tag, assetsPath, signedFlag, manifestPath] = process.argv.slice(2);
  if (!tag || !assetsPath) {
    console.error("Usage: node scripts/verify-desktop-release.mjs v1.0.15 assets.json signed|unsigned [latest.json]");
    process.exit(2);
  }
  try {
    const assets = JSON.parse(fs.readFileSync(assetsPath, "utf8"));
    const manifest = signedFlag === "signed" ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
    verifyDesktopRelease({ tag, assets, signed: signedFlag === "signed", manifest });
    console.log("Verified all desktop installers" + (signedFlag === "signed" ? " and signed platform manifests." : "."));
  } catch (e) {
    console.error("Desktop release verification failed:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
