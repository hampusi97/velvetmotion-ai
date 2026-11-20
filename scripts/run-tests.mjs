#!/usr/bin/env node
/** Discover every repository unit suite so new tests cannot silently miss CI. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function testFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? testFiles(file) : /\.test\.(ts|mjs)$/.test(entry.name) ? [file] : [];
  });
}
const suites = [...testFiles("lib"), ...testFiles("data"), ...testFiles("scripts"), "firestore.rules.test.ts"].sort();
console.log(`Running ${suites.length} test files.`);
const commands = [
  [process.execPath, ["--import", "tsx", "--test", ...suites]],
  [process.execPath, ["--import", "tsx", "scripts/validate-content.ts"]],
  [process.execPath, ["scripts/smoke-test.mjs"]],
  [process.platform === "win32" ? "python" : "python3", ["-B", "-m", "unittest", "workers/test_workers.py"]],
];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
