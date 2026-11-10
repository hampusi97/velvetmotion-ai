import { spawnSync } from "node:child_process";
import { mkdir, rm, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
const next = require.resolve("next/dist/bin/next");
const download = join(root, "public/downloads/velvetmotion-local-windows.zip");
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`Build command failed: ${command} (${result.status})`);
};

// Keep the generated download out of the export it contains on subsequent builds.
await rm(download, { force: true });
await rm(resolve(root, "out"), { recursive: true, force: true });
run(process.execPath, [next, "build"], { ...process.env, SITES_STATIC_EXPORT: "1" });
run("python3", ["scripts/package-local.py"]);
await mkdir(join(root, "public/downloads"), { recursive: true });
await copyFile(join(root, "local-output/velvetmotion-local-windows.zip"), download);
const productionEnv = { ...process.env };
delete productionEnv.SITES_STATIC_EXPORT;
run(process.execPath, [next, "build"], productionEnv);
