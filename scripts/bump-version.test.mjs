import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

test("bump-version.mjs supports explicit release versions and syncs Tauri manifests", () => {
  const src = readFileSync("scripts/bump-version.mjs", "utf8");
  assert.ok(src.includes("src-tauri"), "bump-version.mjs must synchronize src-tauri manifests");
  assert.ok(src.includes("tauri.conf.json"), "bump-version.mjs must update tauri.conf.json version");
  assert.ok(src.includes("Cargo.toml"), "bump-version.mjs must update Cargo.toml version");

  const dry = spawnSync(process.execPath, ["scripts/bump-version.mjs", "--dry-run", "1.0.99"], {
    encoding: "utf8",
  });
  assert.equal(dry.status, 0);
  assert.ok(dry.stdout.includes("1.0.99"));
});
