# VelvetMotion automatic updates — website and desktop

This implementation is on GitHub `main` (initial rollout) with an additional follow-up for desktop connectivity. Changes to **commits merged or pushed to `main`** trigger GitHub release builds; unmerged feature branches are not executable update sources. In-app signed updates require one-time GitHub Actions key configuration.

## Website: every main commit

Workflow: `.github/workflows/ci-web.yml`

1. On each `main` push, GitHub checks dependencies, portraits, lint, TypeScript and Next.js static build.
2. If all checks pass, `cloudflare/wrangler-action` publishes `out/` to the `velvetmotion-ai` Cloudflare Worker using `wrangler.toml`.
3. The production deployment step **fails visibly** if Cloudflare deployment credentials are missing; it no longer silently appears successful while doing nothing.
4. Pull requests may create a separate Cloudflare preview when credentials exist. Preview work does not update the public live site.
5. Existing web sessions are informed via `LiveUpdateBanner`, which checks `/build-meta.json`. New visitors get the current deployed files; people in an active conversation can refresh when safe rather than lose unsaved work.

**One-time required repository secrets** (GitHub → Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN` — restricted Cloudflare API token authorized to deploy the `velvetmotion-ai` Worker.
- `CLOUDFLARE_ACCOUNT_ID` — the matching Cloudflare account identifier.

Secrets **must never** be pasted into GitHub files, frontend source, issues, chats or browser localStorage.

## Desktop: automatic cross-platform installer publishing

Workflow: `.github/workflows/release-desktop.yml`

Each `main` push creates a new sequential `vMAJOR.MINOR.PATCH` version and builds native installers for:
- Windows x64
- macOS Apple silicon
- macOS Intel
- Linux x64

The workflow uploads all installer assets to a **draft** GitHub Release, then makes the release public only after **all four platform jobs succeed**. Tags can also be published manually and the workflow can be started using Actions → Run workflow.

Official download location: https://github.com/hampusi97/velvetmotion-ai/releases

A new GitHub release **does not magically replace applications that are already running on someone else's computer**. It makes new installers available for download. For true in-app installation, configure signed updates below.

## Desktop: cryptographically signed in-app updates (required for automatic installation)

The app's Tauri code has a separate `signed-updater` feature. It is enabled **only when the trusted signing public key and private key are configured**, and update packages are validated before installation. Unsigned builds never turn on this feature or install arbitrary binaries.

**One-time secure setup:**
1. Install the [Tauri CLI](https://v2.tauri.app/) on a trusted local computer (for example, `cargo install tauri-cli --version "^2.0" --locked`). Generate a signing key pair with `cargo tauri signer generate -w ~/.tauri/velvetmotion.key`. Keep the private key in secure personal storage as well as GitHub Secrets.
2. Store the private key in GitHub repository **Actions secret** `TAURI_SIGNING_PRIVATE_KEY`. If the key is passphrase-protected, store the passphrase in Actions secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Never put the private key into Git.
3. Store the matching **public key content**, not a filesystem path, as GitHub repository **Actions variable** `TAURI_UPDATER_PUBKEY`.
4. Merge a vetted commit to `main` or trigger the workflow with a fresh release version. GitHub now produces signed update artifacts and `latest.json` at `https://github.com/hampusi97/velvetmotion-ai/releases/latest/download/latest.json`.
5. Download **that newly signed** release once. Earlier unsigned releases cannot retrospectively trust newly created signing keys. The signed build checks at startup and can automatically install verified updates by default; users can turn that off in the desktop Download page. On new releases during an active session, it prompts instead of interrupting.

When either public or private key is missing, the workflow publishes **manual-download installers only**. A partially configured pair causes a hard error. This prevents silently creating an allegedly signed updater with incomplete credentials.

**Online update behavior:** The desktop checks at startup, when the network comes back online, on window focus (throttled), and every 30 minutes. Signed updates can install automatically on startup if enabled. When a newer release is found mid-session, the app offers an **Install verified update** button; it never restarts over an ongoing conversation. After installation, the user may restart to run the new version. Older unsigned builds are directed to the official installer, not a simulated self-update. Updates are *published releases*, not arbitrary source-file commits. Tauri requires a valid signature before installation.

### Signing and code signing are different
Tauri's update signature authenticates an update payload; it does *not* automatically provide Windows Authenticode signing, Apple Developer ID signing or notarization. Those are separate distribution requirements for a polished professional installer.

## How to verify that automation is working

- Merge a minor content/UI edit into `main` and confirm the **CI & Deploy Web** run includes the Cloudflare production step. If credentials are absent, it must fail with an explicit error.
- Confirm the deployed site's `build-meta.json` commit matches that deployment. Test a fresh browser and an already-open tab.
- Confirm **Automatic VelvetMotion Desktop Release** created a new release with all four platforms; it now checks Windows x64, macOS Intel, macOS Apple Silicon and Linux x64 installers before publishing. For signed releases it also checks the Tauri manifest contains verified platform entries. If validation fails, it remains a draft.
- After configuring signing, verify that the release contains `latest.json` and signed payloads, then test upgrade from a signed older version on real Windows, macOS (both architectures) and Linux devices. Refuse corrupted signatures and untrusted URLs.
- GitHub workflows can run successfully without proving that Chat, TTS, image or video models are installed. Test those separately with real compatible backends.

## Limitations

This GitHub connection can commit workflows but cannot write GitHub Actions secrets/variables. Without the account owner's one-time Cloudflare deployment token and Tauri signing setup, automated web deployment and signed in-app updates cannot be claimed as active. The CI workflows reveal missing credentials rather than pretending success.

Web frontend changes can deploy on every `main` commit when the configured host is available. The desktop keeps its bundled UI locally but connects to GitHub Releases for update checks and to explicitly selected internet/cloud services. The Download page links to the live web version, which updates on its own hosting schedule. Native installers and true local AI model dependencies require separate platform builds; source code does not contain pretrained GPU weights.
