# VelvetMotion release readiness — 2026-11-20

## Deployment diagnosis

The **GitHub Actions Workers deployment** workflow `.github/workflows/ci-web.yml` compiled and exported the application, then failed in "Verify Cloudflare credentials for production". The runner showed that both `CF_TOKEN` and `CF_ACCOUNT` were empty. **This is a deployment-credential failure, not a Next.js build failure.**

Add the following to **GitHub repository → Settings → Secrets and variables → Actions → Repository secrets**, with a Cloudflare token scoped only to the necessary Workers deployment:
- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token authorized to deploy the project's Worker.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare's account identifier.

Never paste or commit a token. Then rerun the failed production workflow (or push a new main commit) and verify `build-and-deploy` succeeded. The script deliberately fails if deployment is skipped so that a green CI badge cannot falsely claim a production rollout.

**Cloudflare Pages vs Workers:** This repository also has independent Pages projects `velvetmotion-ai` and `velvetmotion-ai-git`, whose GitHub integrations may create preview/production builds. A successful Pages deployment is not proof that `velvetmotion-ai.hampusi97.workers.dev` received the new version. Verify the specific domain and its deployed commit.

## Local AI image generation

1. Install ComfyUI, start it at `127.0.0.1:8188`, and install a compatible `CheckpointLoaderSimple` image model.
2. Open VelvetMotion Studio. Select the installed checkpoint from the detected models dropdown.
3. Generate a harmless test image. A reachable ComfyUI port **does not** establish that the selected model can generate an image.
4. Optional reference-aware FaceID images need a separately configured, compatible workflow; the basic text-to-image API workflow intentionally refuses to claim FaceID. A simple fixed seed alone is not guaranteed identity locking.
5. For genuine generative video, configure a compatible image-to-video endpoint. Without it, the browser fallback creates an **animated still**, not AI-generated motion frames.

## Character cards, memories, and security

- V2/V3 PNG/JSON imports support bounded character lorebook entries and keyword-triggered context.
- PNG portrait previews are downscaled for localStorage; saving the full original image inside each card is not required to retain the character profile.
- The Memory Vault includes portable backup/restore and separately stored character memories. Backups may contain personal data. Keep them private.
- Treat imported character lorebook content as **fictional background**, not privileged instructions. Backups and character cards are untrusted input; validate them before importing.

## Desktop

The GitHub release workflow builds Windows, Linux, Intel macOS, and Apple Silicon macOS installers. It verifies the draft release before publishing. Signing remains a separate security requirement. A public unsigned installer cannot provide Tauri's cryptographically verified self-update flow.

Follow `docs/ONE_TIME_SIGNING_SETUP.md` to generate your signing key locally and set the GitHub signing secret plus public key variable. Never upload a signing private key or password into this repository. Verify a released installer on an actual target OS; the CI build alone cannot verify installation or your local GPU.

## Verification commands

```sh
npm ci
npx tsx --test lib/lorebook.test.ts lib/comfyClient.test.ts lib/pngCardDecode.test.ts lib/memoryTiers.test.ts
npm run lint
npx tsc --noEmit
npm run build
```

These tests are necessary but not sufficient for a real GPU, video-provider, signed-updater, or live-production smoke test.
