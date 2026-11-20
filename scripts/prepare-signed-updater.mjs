/**
 * Run only inside the trusted GitHub release job, after version synchronization.
 * The public key is injected from repository Actions variable TAURI_UPDATER_PUBKEY.
 * The signing PRIVATE key is never written to this repo or printed in build logs.
 */
import fs from "node:fs";
import path from "node:path";

const pubkey = (process.env.TAURI_UPDATER_PUBKEY || "").trim();
if (pubkey.length < 32) {
  throw new Error("TAURI_UPDATER_PUBKEY is missing or invalid; cannot create a signed updater build.");
}
const confPath = path.resolve("src-tauri/tauri.conf.json");
const config = JSON.parse(fs.readFileSync(confPath, "utf8"));
config.bundle = { ...(config.bundle || {}), createUpdaterArtifacts: true };
config.plugins = {
  ...(config.plugins || {}),
  updater: {
    pubkey,
    endpoints: [
      "https://github.com/hampusi97/velvetmotion-ai/releases/latest/download/latest.json",
    ],
    windows: { installMode: "passive" },
  },
};
fs.writeFileSync(confPath, JSON.stringify(config, null, 2) + "\n");
console.log("Signed updater metadata enabled for verified GitHub Releases. (Public key only.)");
