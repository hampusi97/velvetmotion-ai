# Activate signed automatic updates — one-time owner setup

You only need to do this **once** on a trusted Windows, macOS or Linux computer. Do not generate or disclose the private signing key in a chat, browser sandbox, GitHub source file, online issue, email or public cloud computer. The repository's GitHub integration cannot add Actions secrets on your behalf.

**What already exists:** The official release workflow builds Windows, macOS Apple Silicon, macOS Intel and Linux installers when changes reach `main`. The desktop checks published releases. An unsigned install cannot silently install a signed release until you install the first properly signed version. Tauri cryptographically verifies later in-app updates.

## Recommended setup using the helper script

On your own computer, install:
- [Node.js 20+](https://nodejs.org/)
- [GitHub CLI (`gh`)](https://cli.github.com/) and sign in using `gh auth login`, with repository Actions secret-writing permission
- [Rust/Cargo](https://rustup.rs/) and Tauri CLI v2 via `cargo install tauri-cli --version "^2.0.0" --locked`
- Git, if you want to clone the repository

Then in a terminal:

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
node scripts/setup-signing.mjs
```

The script:
1. Confirms an authenticated GitHub CLI session and the exact `hampusi97/velvetmotion-ai` destination.
2. Generates a Tauri v2 public/private updater signing pair **on your computer**, under `~/.velvetmotion-signing/`. It refuses to overwrite an existing pair and asks for explicit confirmation.
3. Pipes the private key directly from its file into the encrypted GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`; it never prints the key.
4. Uploads the matching public key into GitHub Actions variable `TAURI_UPDATER_PUBKEY` (the public key may be shared).
5. If you chose a signing password, prompts you to store the matching value in the `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` Actions secret. Do not put the password in a shell argument, script, git file or chat.
6. Checks **names only** of configured credentials, then tells you how to build the first signed release.

**Keep an offline encrypted backup** of the private key and its passphrase. If lost, already-installed users may be unable to verify your next release.

If the script cannot reach GitHub or you have insufficient permissions, it must stop with an error. Your local private key remains on your computer. Re-run it to reuse the same existing key pair after fixing GitHub CLI authorization.

## Manual GitHub UI alternative

If you don't want to run `gh` CLI, generate the key locally with:

```bash
cargo tauri signer generate -w ~/.tauri/velvetmotion.key
```

Then open **https://github.com/hampusi97/velvetmotion-ai/settings/secrets/actions** and add:
- Repository secret `TAURI_SIGNING_PRIVATE_KEY`: full contents of the local `velvetmotion.key` file
- Repository secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the signing password, if you used one
- Under **Variables**, repository variable `TAURI_UPDATER_PUBKEY`: full contents of `velvetmotion.key.pub`

These must match the key pair. Never publish the private key in the repository. For Windows, use a writable path under your user profile instead of `~/.tauri` if needed.

## Verify activation

1. Open **https://github.com/hampusi97/velvetmotion-ai/actions/workflows/release-desktop.yml** and run **Automatic VelvetMotion Desktop Release** with no explicit version, or merge the next reviewed change to `main`.
2. The workflow now detects both keys and builds **signed** installers, a Tauri `latest.json` updater manifest, and the signature artifacts for supported operating systems. Its validation step prevents an incomplete release being published.
3. Check **https://github.com/hampusi97/velvetmotion-ai/releases**: the new release should contain complete OS installers and `latest.json`.
4. **Install that first signed release manually** on each computer. This seeds the public verification key in the application.
5. Future signed releases are checked online on startup, on network reconnect, on window focus and every 30 minutes. On startup, a user who has left auto-update enabled can install automatically; during an active chat the app offers an update prompt instead of an unexpected restart.

Tauri's official guide: https://v2.tauri.app/plugin/updater/

## Separate issue: website hosting

Cloudflare Workers Builds publishes the website from `main` through its Git integration. The manual GitHub Actions deploy uses separate encrypted `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Vercel's Git integration follows its linked project and billing limits.

## Important boundaries

- Tauri updater signing differs from Microsoft Authenticode signing and Apple Developer ID/notarization.
- A static compiled desktop binary cannot fetch raw GitHub commits and safely execute them as if they were trusted product releases.
- If a machine remains on an unsigned version, it needs one manual installation of the first signed version.
- The key must be backed up; do not rotate signing keys casually.
- Local runtime/model checkpoint installation remains a separate opt-in setup and is not bundled into standard desktop releases.
