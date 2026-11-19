import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targetArg = args.find((a) => !a.startsWith("-")) || "patch";

const pkgPath = path.join(root, "package.json");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoPath = path.join(root, "src-tauri", "Cargo.toml");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
const cargoRaw = fs.readFileSync(cargoPath, "utf8");

function parseSemver(v) {
  const m = String(v || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const cargoMatch = cargoRaw.match(/^version\s*=\s*"([^"]+)"/m);
const candidates = [pkg.version, tauriConf.version, cargoMatch?.[1]]
  .map(parseSemver)
  .filter(Boolean);

if (candidates.length === 0) {
  console.error("[bump-version] Could not parse any existing semver version.");
  process.exit(1);
}

candidates.sort(compareSemver);
const highest = candidates[candidates.length - 1];

let nextVersion;
if (targetArg === "patch") {
  nextVersion = `${highest[0]}.${highest[1]}.${highest[2] + 1}`;
} else if (targetArg === "minor") {
  nextVersion = `${highest[0]}.${highest[1] + 1}.0`;
} else if (targetArg === "major") {
  nextVersion = `${highest[0] + 1}.0.0`;
} else if (/^\d+\.\d+\.\d+$/.test(targetArg)) {
  nextVersion = targetArg;
} else {
  console.error(`[bump-version] Invalid version or bump kind: ${targetArg}. Use patch | minor | major | X.Y.Z`);
  process.exit(1);
}

if (dryRun) {
  console.log(`[bump-version] Dry run -> ${nextVersion} (from highest ${highest.join(".")})`);
  process.exit(0);
}

pkg.version = nextVersion;
tauriConf.version = nextVersion;
const nextCargo = cargoRaw.replace(/^(version\s*=\s*)"([^"]+)"/m, `$1"${nextVersion}"`);

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
fs.writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`, "utf8");
fs.writeFileSync(cargoPath, nextCargo, "utf8");

console.log(`[bump-version] Synced package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml -> ${nextVersion}`);
