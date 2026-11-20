# VelvetMotion AI

A private AI companion studio built with Next.js, React, TypeScript and Tauri. Fictional adult characters, persistent conversations and memories, optional local inference, voice, and provider-backed image/video generation.

## Develop and verify

Requires Node.js 22+ and Python 3 for the worker tests.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Browse the character library at `/companions/`, preview a profile, save favorites, or import original starter characters at `/?view=import`.

```sh
npm test
npm run audit:companions
npm run lint
npx tsc --noEmit
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm test` discovers every unit test in `lib`, `data`, and `scripts`, then checks content, platform scripts and Python workers. Browser checks use the production static export, isolated test profiles, and desktop/mobile Chromium projects. They do not use paid providers or user accounts. GitHub Actions saves screenshots and failure traces.

## Companion library

- Search across names, personalities, backgrounds and interests; combine personality, conversation, mood, visual-style and saved filters.
- Explore full profiles, preview synthetic voice, customize personality and opening messages, and upload or generate a replacement portrait through a configured local model.
- Saved edits retain the character ID, keeping existing chat and memory associations. Browser storage failures are reported.
- Ten opt-in original adult starter companions include explicitly labeled illustrations; no third-party character artwork or model weights are bundled with that pack.
- Import V2/V3 PNG or JSON cards. Profile exports offer V2/V3 JSON with character lorebooks and metadata, excluding personal chat memories. CHARX archives and compressed PNG metadata are not supported.

## Actual AI capabilities

| Feature | Required service or asset |
| --- | --- |
| Text conversations | Ollama, KoboldCpp, a compatible custom endpoint, or a selected supported cloud provider |
| Neural speech | Compatible local TTS service; device speech is an explicitly identified fallback |
| Image generation | Configured ComfyUI, AUTOMATIC1111/Forge, or a supported hosted image service |
| Generated video | Compatible image-to-video service or an imported ComfyUI API workflow with installed models |
| Animated still | Browser render; this is separate from model-generated video |
| Experimental 3D avatar | User-provided self-contained VRM asset; basic Three.js preview, not full VRM animation support |

Provider availability, usage costs, CORS permissions and model licenses depend on the chosen service. A browser or installer does not bundle a generative GPU server. Fixed seeds and appearance prompts alone do not guarantee identity consistency.

Conversations, profiles and media use browser storage and IndexedDB. Optional signed-in cloud backup can sync data; exports are not encrypted. Review the privacy settings before sharing personal content.

## Deployment and desktop

The production build is a static export in `out/`. Cloudflare can deploy through its native Git integration, which CI verifies for the current commit. Direct Wrangler deployment optionally uses repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. A successful application build alone does not establish a successful deployment. Native desktop CI builds installers for Windows, Linux and macOS. Verified in-app updates require owner-controlled signing setup and installation of the first signed release.

- [Current audit and prioritized backlog](docs/DEVELOPMENT_AUDIT_2026-11-20.md)
- [AI generation setup](docs/AI_GENERATION_SETUP.md)
- [VRM and ComfyUI video setup](docs/VRM_COMFY_VIDEO_SETUP.md)
- [Secure desktop signing setup](docs/ONE_TIME_SIGNING_SETUP.md)
- [Feature status](docs/FEATURES_STATUS_AND_NSFW_ROADMAP.md)
