# VelvetMotion Private Atelier — Desktop Release and Local Compute

This guide documents the desktop app implementation on the GitHub improvement branch. It is not a claim that all external AI generators are installed or live.

## Real installer source

- Official releases: https://github.com/hampusi97/velvetmotion-ai/releases
- Published release checked during development: **v1.0.13**, with Windows EXE/MSI, Apple silicon and Intel macOS DMG, and Linux AppImage/DEB/RPM assets.
- The download page now queries the **same repository** and presents only the matching official GitHub asset for each selected platform.
- Installer lookup failure links to the releases index; it never silently substitutes an incompatible Mac architecture or a third-party download domain.

## How to use local models

1. Install the VelvetMotion desktop app, or use the web interface.
2. Install a local inference runtime (e.g. Ollama for language chat, KoboldCpp for GGUF, or ComfyUI for images and compatible video workflows). These are independent projects governed by their own licenses and policies.
3. Download a model checkpoint that fits available **RAM, VRAM and CPU/GPU**. A standalone desktop installer does not contain those model weights.
4. Start the local runtime and load a model; check the local service ports from VelvetMotion Desktop.
5. Select a local provider in AI Settings. Efficient/Balanced/Expressive alters actual max text tokens and local request timeout; it does **not** allocate operating-system RAM or accelerate model inference by itself.

## Security changes

- **Bundled UI:** The native Tauri window no longer silently navigates to the public web app on startup. This preserves the native origin/security boundary and makes the bundled app predictable when offline.
- **Updates:** No auto-updater should run without a signing key and verified HTTPS update manifest. The incomplete updater configuration and plugin have been removed. Users download and install newer versions manually from official GitHub Releases.
- **Home Engine:** The bundled Python bridge binds to `127.0.0.1:8787` only and no longer automatically starts a public Cloudflare Quick Tunnel. It restricts browser CORS to the known app/local origins, limits JSON request bodies, and does not serve the current working directory when `out/` is missing.
- **Privacy:** The Home Engine **does not silently send prompts to a cloud image provider**. A user must explicitly set `VELVET_ALLOW_CLOUD_FALLBACK=1` to enable the optional general-purpose cloud fallback. Adult requests are not routed through that general-purpose fallback.
- **Video:** A reachable ComfyUI server is not proof of a video workflow. The bridge now returns a clear `501` until a real compatible video model endpoint is configured.
- **User photos:** Original fictional adult artwork is eligible for compatible adult-mode model routing. Real-person photos (including selfies) remain restricted to nonsexual animation. Declarations in the browser are not verification; a future server must check rights and apply production safeguards.

## Download / update behavior

The desktop Download page offers Windows x64, macOS Apple silicon, macOS Intel, and Linux selectors. On mobile it explains that desktop installers are not mobile apps. When a release asset is missing or the API fails, it links to the official GitHub releases index.

Settings can now query the **actual latest published release** and compare it to the native packaged version via `desktop_app_version`. It reports uncertainty when network access or installed-version data are unavailable. No fake "already up to date" messages.

## Prerequisites for a signed production desktop release

1. Run the desktop-native CI job (`Desktop Native Validation`) and verify native Rust compilation and the bundled frontend.
2. Configure OS-level code signing and, for macOS, the relevant notarization requirements. This is separate from Tauri updater artifact signing.
3. If automatic updates are later added, generate and protect a Tauri signing private key, embed the matching **public key** in a reviewed updater configuration, serve signed artifacts and manifests over a trusted channel, and test downgrade/rollback and corrupted-signature rejection.
4. Test EXE/MSI, both macOS architectures, and Linux bundles on real supported machines. Do not call builds "signed" or "auto-updating" until those tests pass.
5. Audit native permissions, third-party content, Firebase rules, browser-to-local API access and upload privacy before accepting payments or promoting this as production-ready.

## Next features

- Native setup assistant for locally installed models, with verified downloads and checksums.
- Real GPU/VRAM detection (current native bridge reports **system RAM**, CPU and local ports, not reliably per-device VRAM).
- Optional single-click launch of **trusted installed** runtimes with explicit user approval, not arbitrary remote command execution.
- Downloadable offline model packs subject to legal/model license review, bandwidth costs, and explicit disk-space confirmation.
- Production-grade private media storage, complete deletion/export controls, and generation progress/cancellation.
