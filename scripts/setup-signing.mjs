#!/usr/bin/env node
/**
 * One-time OWNER-SIDE Tauri 2 signing setup. Run only on your own trusted
 * computer with GitHub CLI and Cargo Tauri CLI. This script NEVER logs key
 * material, places keys in the repository, or invokes an unreviewed workflow.
 *
 * The private key is piped directly into the encrypted GitHub Actions secret
 * API through gh. Keep a separate offline encrypted backup. This script does
 * not accept key material via chat, command-line args or cloud code runners.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const REPO = "hampusi97/velvetmotion-ai";
const SIGNING_DIR = path.join(os.homedir(), ".velvetmotion-signing");
const KEY_FILE = path.join(SIGNING_DIR, "velvetmotion.key");
const PUB_FILE = KEY_FILE + ".pub";

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    stdio: "inherit",
    shell: false,
    windowsHide: false,
    ...options,
  });
  if (result.error) {
    throw new Error(`Could not run ${program}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${program} exited with status ${result.status}`);
  }
  return result;
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run this script from an interactive terminal on your own computer, not an online runner.");
  }
  console.log("VelvetMotion — private desktop update signing setup");
  console.log("Repository: " + REPO);
  console.log("Signing keys stay local. Only encrypted GitHub Actions secrets are uploaded.\n");
  run("gh", ["auth", "status"]);
  run("gh", ["repo", "view", REPO, "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);

  fs.mkdirSync(SIGNING_DIR, { recursive: true, mode: 0o700 });
  if (fs.existsSync(KEY_FILE) !== fs.existsSync(PUB_FILE)) {
    throw new Error("Only one of the private/public files exists. Recover the matching key pair before proceeding.");
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (!fs.existsSync(KEY_FILE)) {
      console.log("\nA NEW signing key pair will be created outside your Git checkout.");
      console.log("When Tauri asks for a password, choose a strong unique one.");
      console.log("Store the key file AND password in an offline encrypted backup.");
      const confirmation = await rl.question("Generate new signing key? Type GENERATE: ");
      if (confirmation.trim() !== "GENERATE") throw new Error("Cancelled without generating credentials.");
      run("cargo", ["tauri", "signer", "generate", "-w", KEY_FILE]);
    } else {
      console.log("\nExisting local signing key pair detected. Reusing it; will NOT rotate credentials.");
      const confirmation = await rl.question("Reuse existing signing key? Type REUSE: ");
      if (confirmation.trim() !== "REUSE") throw new Error("Cancelled. Key material unchanged.");
    }
    if (!fs.statSync(KEY_FILE).size || !fs.statSync(PUB_FILE).size) {
      throw new Error("Tauri did not create nonempty private/public key files.");
    }
    if (process.platform !== "win32") {
      fs.chmodSync(KEY_FILE, 0o600);
      fs.chmodSync(PUB_FILE, 0o600);
    }
    console.log("\nUploading signing PRIVATE key directly into GitHub Actions encrypted secret...");
    run("gh", ["secret", "set", "TAURI_SIGNING_PRIVATE_KEY", "--repo", REPO], {
      input: fs.readFileSync(KEY_FILE),
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log("Uploading matching PUBLIC key into GitHub Actions repository variable...");
    run("gh", ["variable", "set", "TAURI_UPDATER_PUBKEY", "--repo", REPO], {
      input: fs.readFileSync(PUB_FILE),
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log("\nTauri signing keys commonly use a password.");
    console.log("The GitHub CLI will ask you to enter the SAME signing password.");
    console.log("Do not paste the password into ChatGPT or use it as a shell argument.");
    const setPassword = await rl.question("Did you choose a nonempty signing password? Type YES or NO: ");
    // Release the interactive terminal before gh asks for the secret value.
    rl.close();
    if (setPassword.trim() === "YES") {
      // gh prompts interactively, without printing the secret in script output.
      run("gh", ["secret", "set", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD", "--repo", REPO]);
    } else if (setPassword.trim() !== "NO") {
      throw new Error("Password secret was not configured. Re-run the script to finish.");
    } else {
      console.log("No signing password secret was set.");
      console.log("If there was one from an older key, delete that obsolete password secret in GitHub settings.");
    }

    console.log("\nVerifying only secret/variable NAMES (values cannot be retrieved)...");
    run("gh", ["secret", "list", "--repo", REPO]);
    run("gh", ["variable", "list", "--repo", REPO]);
    console.log("\nONE-TIME SETUP SUBMITTED.");
    console.log("1. Back up the private key offline and protect its password.");
    console.log("2. Trigger Automatic VelvetMotion Desktop Release from GitHub Actions.");
    console.log("3. Confirm Windows, macOS (both architectures), Linux, latest.json and signed assets.");
    console.log("4. Install the FIRST signed release manually; only then can later releases auto-install.");
    console.log("https://github.com/" + REPO + "/actions/workflows/release-desktop.yml");
    console.log("Never delete or rotate this key without a verified key-transition plan.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\nSetup did not complete: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
