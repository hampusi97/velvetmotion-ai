/**
 * GitHub release assets can appear a few seconds after parallel Tauri upload
 * jobs report success. Retry visibility, but never publish a partial release.
 *
 * This is deliberately separate from installer verification: every successful
 * attempt must pass verifyDesktopRelease, including signed manifest checks.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyDesktopRelease } from "./verify-desktop-release.mjs";

export async function verifyReleaseEventually({
  tag,
  signed,
  loadAssets,
  loadManifest = async () => null,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 18,
  delayMs = 10000,
  log = console.log,
}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 30) {
    throw new Error("Release verification attempts must be between 1 and 30");
  }
  let lastError = "no assets returned";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const assets = await loadAssets();
      const manifest = signed ? await loadManifest() : null;
      verifyDesktopRelease({ tag, assets, signed, manifest });
      log(`Verified ${assets.length} release assets on attempt ${attempt}/${attempts}`);
      return { attempt, assets };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log(`Release ${tag} not ready (${attempt}/${attempts}): ${lastError}`);
      if (attempt < attempts) await wait(delayMs);
    }
  }
  throw new Error(`Refusing to publish incomplete desktop release ${tag}: ${lastError}`);
}

function gh(...args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    timeout: 20000,
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function main() {
  const { TAG, GITHUB_REPOSITORY, UPDATE_PUBLIC_KEY } = process.env;
  if (!/^v\d+\.\d+\.\d+$/.test(TAG || "") ||
      !/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY || "")) {
    throw new Error("A valid release tag and GitHub repository are required.");
  }
  const signed = Boolean(UPDATE_PUBLIC_KEY);
  const temporary = mkdtempSync(join(tmpdir(), "velvetmotion-release-"));
  try {
    await verifyReleaseEventually({
      tag: TAG,
      signed,
      loadAssets: () => JSON.parse(gh("release", "view", TAG, "--repo", GITHUB_REPOSITORY,
        "--json", "assets", "--jq", "[.assets[].name]")),
      loadManifest: () => {
        gh("release", "download", TAG, "--repo", GITHUB_REPOSITORY,
          "--pattern", "latest.json", "--dir", temporary, "--clobber");
        return JSON.parse(readFileSync(join(temporary, "latest.json"), "utf8"));
      },
      log: message => console.log(message),
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
