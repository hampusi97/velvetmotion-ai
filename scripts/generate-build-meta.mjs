import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

let commitSha = (process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || "").trim();
if (commitSha) {
  commitSha = commitSha.slice(0, 7);
} else {
  try {
    commitSha = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    commitSha = "local";
  }
}

const payload = {
  version: String(pkg.version || "1.0.0"),
  commitSha,
  builtAt: new Date().toISOString(),
};

const outPath = path.join(root, "public", "build-meta.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[build-meta] Wrote ${path.relative(root, outPath)} -> v${payload.version} (${payload.commitSha})`);
