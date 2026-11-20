# VelvetMotion AI — Private Atelier

An original, cinematic companion interface for **fictional adults**, featuring character discovery, interactive stories, chat, synthetic voices, image/video workflows and an optional local-first desktop app.

VelvetMotion is **not a turnkey hosted AI model**. Many generative features require a real third-party provider or a separately installed, compatible local model. The interface distinguishes a real generation result from an animated still or offline model.

## Start here

- [How it works — interactive guide](https://github.com/hampusi97/velvetmotion-ai/tree/main/app/guide)
- [Current capability audit, adult-fiction feature ideas and limits](docs/FEATURES_STATUS_AND_NSFW_ROADMAP.md)
- [Configure chat/image/video/speech providers](docs/AI_GENERATION_SETUP.md)
- [Desktop setup, installers, local compute and safety](docs/DESKTOP_PRIVATE_ATELIER.md)
- [Desktop signed automatic updates — one-time owner setup](docs/ONE_TIME_SIGNING_SETUP.md)
- [Automatic releases and website deployment](docs/AUTOMATIC_UPDATES.md)
- [Competitive UX research and remaining priorities](docs/COMPETITIVE_EXPERIENCE_RESEARCH.md)

**Download:** [Official GitHub releases](https://github.com/hampusi97/velvetmotion-ai/releases)

## Features and what actually works

| Area | Function | Availability |
| --- | --- | --- |
| Discover | Browse original fictional-adult portraits, filter, sort, save favorites | Runs in browser; portraits are curated images |
| Companion Creator | Customize a personality, backstory, original artwork reference and synthetic voice | Creator runs; generating a consistent new face requires a compatible image model |
| Chat | Persona-aware one-on-one replies with local/online provider routing and small memory features | Needs Ollama/KoboldCpp, OpenRouter/BYOK, AI Horde or another compatible provider |
| Multi-character | Two-character and group conversations with sequential context-aware model turns | Needs AI provider; outages are reported honestly |
| Scene Director | Romance, fictional relationship drama, pace, boundaries and fade-to-black | Directs a connected text model; not a pre-rendered scene |
| Photos | Compose images using prompts, scenes, formats and seed controls | Needs a compatible image model; adult imagery depends on provider rules |
| Reference variations | Use original fictional artwork as a reference for img2img | Needs a reference-aware local or external model |
| Video | Generate video with configured backend, or make a labeled pan/zoom WebM preview | Actual generative frames need a real video model |
| Voices | Device previews, optional Kokoro neural speech, character voice presets | Neural audio needs a running compatible TTS model |
| Collection & Backup | Save local art/text where supported, export/import data | Browser storage is user-clearable; download important files |
| Desktop app | Windows/macOS/Linux interface, local model connection checks, GitHub release checks | Native installers available; AI model weights are not bundled |

For details and implementation files, see [the capability audit](docs/FEATURES_STATUS_AND_NSFW_ROADMAP.md).

## Quick start (website development)

Requires Node.js and npm.

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm ci
npm run dev
```

Open http://localhost:3000. The Next.js 15 application uses a static export for production. To build:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The static output lives in `out/`. **Do not add frontend calls to `/api/...` assuming a local Next.js API route exists on the deployed site.** Connect inference through the documented provider adapters or an explicitly configured hosted service.

## Desktop app and your own hardware

The desktop version uses **Tauri 2** and the same bundled UI. Native runtime checks can detect likely local endpoints (Ollama, KoboldCpp, ComfyUI, Kokoro and optional bridge). A port responding does **not** mean the correct model or weights are loaded.

To use local AI, install your chosen model runner and compatible model weights separately, start its server, and connect it in the app. GPU and VRAM needs depend on the model.

GitHub Actions builds desktop installers for Windows, Mac Apple Silicon, Mac Intel and Linux when a reviewed change reaches `main`.

### Activate signed automatic desktop updates

The updater implementation supports internet release checks and verified installation, but **the repository owner must perform one-time signing setup**. On your own trusted computer with `gh` authenticated and Cargo Tauri CLI installed:

```bash
node scripts/setup-signing.mjs
```

The setup script generates a local private/public signing key pair and uploads it to GitHub Actions secrets/variables without putting the private key into Git. Back it up offline, follow the prompts and install the **first signed release** manually. Existing unsigned installers cannot securely self-upgrade without that step.

See [full one-time setup instructions](docs/ONE_TIME_SIGNING_SETUP.md). Never paste signing keys into chat or public source code.

## Providers and privacy

- **Local:** Connect actual running inference services; browser UI alone does not download or use model weights automatically.
- **Cloud:** Provider integration requires the provider to be available, authenticated where needed, and to permit the specific requested content.
- **Images/videos:** Real-person photos, including a user's own selfie, are limited to nonsexual animation. Adult-fiction visual workflows accept *original fictional-adult artwork*, with rights acknowledged; commercial production requires server-side source/age/consent verification, not just client checkboxes.
- **Voice:** Female-style voice presets are synthetic model presets, **not** recordings or clones of real people. Any future voice-cloning tool would need verified speaker consent, revocation and deletion.
- **Saved data:** Local storage and IndexedDB are not encrypted backups or permanent guarantees. Review optional Firebase sync and cloud provider processing before submitting sensitive content.
- **Trust:** No fake "generated" results, fake provider availability, or paid credit charges for simple still-photo animations.

## Deployment

- **Cloudflare:** Workers Builds publishes the static site from `main` through its Git integration. The `CI & Deploy Web` workflow runs lint, TypeScript, content checks, and a static build, then verifies that the production site serves the expected commit. For a manual deploy from GitHub Actions, configure the encrypted `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
- **Vercel:** A separate Git-linked Vercel project may automatically build from `main` when its plan and usage limits permit. Check the real Vercel deployment status rather than assuming a successful GitHub merge proves production is live.
- **Native releases:** `.github/workflows/release-desktop.yml` creates platform installers and validates release completeness before publishing. Signed update artifacts require Tauri signing keys.

**Production launch blockers:** real generator tests, secure hosted inference and credentials, age assurance, backend image provenance/consent enforcement, private media deletion/storage, signed OS distributions, accessible UI tests, and billing/refund controls. A passing frontend build is not a substitute for any of these.

For the full product plan, see [the competitive research and roadmap](docs/COMPETITIVE_EXPERIENCE_RESEARCH.md).
