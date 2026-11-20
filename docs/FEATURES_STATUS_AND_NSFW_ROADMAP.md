# VelvetMotion AI — Feature and Capability Audit

Audit date: 2026-11-19 (America/Denver). Basis: source in `hampusi97/velvetmotion-ai` main at `df043a82`, plus the improvements in the companion audit PR. **Code presence is not proof an external inference model is online or commercial-production readiness.**

**Source labels**
- **Functional in browser:** actual UI, locally persistent state, or pure client-side features without a remote generative model (browser storage remains user-clearable).
- **Provider-dependent:** calls external/local model runtimes or hosted services. The feature UI exists, but quality and availability require a configured, capable, policy-compatible model.
- **Prototype / presentation:** useful preview, effect, preset or local-only behavior, not the fully advertised realtime/generative capability.
- **Not production-ready:** needs server-side safety, secure storage, privacy compliance, operations, or runtime tests.

## What a customer can do

| Feature | How it works in current source | Reality / limitation |
| --- | --- | --- |
| Explore & Discover | `lib/characters.ts`, `data/companions.ts`, `components/home-view.tsx`; filters, search, categories, character cards, local favorites | Functional in browser. Portraits are curated static images; visually moving cards are still-picture animations, not live video |
| Create a fictional companion | `components/CreateGirlWizard.tsx`, custom characters saved locally and optionally synced | Functional form and portrait reference; preview is curated art; generating a consistent unique face still needs real reference-aware model |
| Chat (one-on-one) | `components/CharacterChat.tsx` → `lib/chatRouter.ts`; system persona, recent message history, settings | Provider-dependent: KoboldCpp, Ollama, OpenRouter/BYOK, AI Horde, or a supported home bridge. If none responds, returns an honest error |
| Two-companion chat | `components/DualGirlChat.tsx`; now uses two sequential real model requests with shared context | Provider-dependent; fixed dead `/api/chat` static route and fake fallback in this audit |
| Group chat | `components/GroupChat.tsx`; two selected companions respond sequentially with other speaker context | Provider-dependent; not a continuous many-agent orchestration system |
| Relationship and memory | `lib/memoryMap.ts`, `lib/progression.ts`, `MemoryVaultDrawer`; extracts/edits small memories and local progression | Functional local heuristics. Not a production long-term semantic retrieval engine; memory can be lost if local browser data is deleted |
| Scenario Director | `components/ScenarioDirector.tsx`; select drama, consensual romance, power dynamics, tone | Provider-dependent text prompts. Not a pre-recorded scene generator |
| Fictional adult image generation | `components/MediaStudioModal.tsx` → `lib/mediaGenerator.ts`; ComfyUI/Kobold SD, Cloudflare general model, AI Horde | Provider-dependent. Adult image route must use a model that permits it; third-party availability varies |
| Uploaded fictional art to variations | `lib/referenceImageGenerator.ts`; data-image reference via local ComfyUI or custom img2img bridge | Provider-dependent. Seed alone does not preserve face identity; compatible reference nodes/adapters required |
| Real adult self-portrait | `components/MediaStudioModal.tsx`; mark own photo, rights confirmation, nonsexual animation path | Functional source categorization only. **No sexualized real-person transformations.** Client declarations do not verify identity; production server enforcement required |
| Video Studio | `lib/canvasVideoExporter.ts`; 3/5/8-second clips, adjustable motion and speed, custom endpoint | Two clearly distinct outputs: actual generative video **only from connected model**; otherwise labeled browser-created pan/zoom WebM (not novel AI frames) |
| Voice Atelier | `components/VoiceDesigner.tsx`; preset voice choices, pitch/pace, device previews | Browser Web Speech works when supported; Kokoro 82M neural speech requires an actual compatible server. No real woman's cloned voice |
| Voice calls | `components/VoiceCallModal.tsx`; browser speech recognition where supported, routed AI reply, TTS | Provider-dependent for meaningful response; not a low-latency synchronized audio/video avatar call |
| Character photo albums | `CollectionAndPrivateViews`, `lib/storage.ts`, `lib/db.ts` | Saved locally with backup/export options; browser localStorage/IndexedDB can be cleared. Blob video URLs are temporary unless downloaded/stored persistently |
| Private sets & coins | `components/CollectionAndPrivateViews.tsx`, `lib/coinsStore.ts` | Browser-based unlock and coin logic; **not** a server-enforced paid entitlement/billing system |
| Local model runtime | `components/LocalSetupWizard.tsx`, `lib/localEngineBridge.ts` | Health checks for Ollama, KoboldCpp, ComfyUI, Kokoro and optional Home Engine. A responding port does NOT prove a model is loaded |
| Desktop installers | `src-tauri` + GitHub release workflow | Native installers for Windows, macOS Apple silicon/Intel and Linux. AI model weights not bundled |
| Desktop updates | `components/DesktopAutoUpdater.tsx`, Tauri updater, GitHub `latest.json` | Published release checks via HTTPS. Automatic installation requires **GitHub Actions signing key setup**, and a one-time manual install of the first signed release |
| Sign in / cloud sync | `lib/firebase.ts`, `lib/firebaseSync.ts` | Optional Firebase integration. Requires configured authentication/security rules and backend/privacy review before public adult-media launch |
| Export, backup, import | `components/SettingsAndBackupDrawer.tsx`, `lib/db.ts` | Functional data portability controls. Backups containing intimate text/media must be treated as sensitive |

## How an AI request travels (simplified)

### Chat
1. Choose a companion and enter a message.
2. Client validates obvious prohibited content; constructs fictional persona + context + saved memory.
3. Router probes the selected local or online provider and sends requests. **A failure must not be represented as a realistic generated response.**
4. Returned text is displayed and may be saved to local chat history / optional Firebase sync. Voice playback, if enabled, is a separate TTS request.

### Photos
1. Select fictional adult companion, scene, optional seed and style.
2. For ordinary images: local compatible ComfyUI/Kobold SD first, then eligible external image providers.
3. For an original fictional uploaded character: a reference-aware img2img model needs to be configured. A successful result is saved/downloadable.
4. For explicit material, the provider must explicitly permit the requested category. **Selfies of real people—including the user's own face—are not accepted for sexualized generation.**

### Videos
1. Choose an authorized source portrait and motion/duration.
2. A configured image-to-video backend can synthesize new frames and return MP4/WebM.
3. Without it, only a clearly labeled canvas still-photo animation may be available. Do **not** call that a generative video or bill as if it were one.
4. Save downloaded video files. Object URLs are temporary, not permanent cloud storage.

### Desktop
1. Tauri loads a bundled version of the interface. Native permissions are scoped; a remote website cannot silently replace the native application.
2. User can optionally connect local runtimes to use their own hardware or choose remote providers.
3. On startup and periodically, the app checks published GitHub releases. Signed builds verify update signatures, offer installation, and avoid interrupting active conversations.
4. Code changes pushed to a Git branch are **not** desktop updates until CI builds and publishes a complete release.

## Adult-fiction roadmap (prioritized)

### P0 — Deliver actual quality safely
- **Fictional adult character and story controls:** style/intensity presets, explicit consent boundaries, hard exclusions, custom creator notes, and adult-only eligibility. Keep provider-policy compatibility transparent.
- **Real video infrastructure:** job queue with progress, cancellation, estimates, storage, refunds for failed jobs, actual frame generation, rendering error diagnostics.
- **Identity-stable fictional images:** face reference adapter, wardrobe/location continuity, batch variations, negative prompt controls, pose/camera presets and image comparison view.
- **Server-side consent/provenance and age assurance:** enforce original fictional adult art or approved nonsexual self-portraits on the *server*, not only browser checkboxes. Block third-party intimate deepfakes, impersonation and minors.
- **Privacy and billing:** encrypted private media storage where supported, deletion and export, explicit opt-in cloud transfer, auditable non-duplicate charges, protected API keys and abuse reporting.

### P1 — Premium interactive experience
- **Storyboard Director:** a scene timeline with fictional adult characters, camera shot composition, image references, music/ambience choices (licensed), and render queued shots individually.
- **Couple or ensemble scenes:** separately identifiable consenting fictional adults, stable character appearance and dialog turns, controllable pacing, camera and lighting.
- **Character voice direction:** presets for emotional tone and prosody, captions, recording controls, testable audio quality, licensed synthetic voices. Training a recognizable real voice would require independently verifiable speaker consent.
- **Interactive branching scenes:** bookmark a moment, change a dialogue choice, replay alternate story branches and export text/storyboards.
- **Private themed media vault:** favorites, tags, filters, per-character galleries, sensible storage quota warnings, batch downloads, one-click deletion.
- **Better motion:** actual lip sync with aligned generated audio, idle-motion vs generated-video labeling, hardware/model support map and true preview frames.

### P2 — Original luxury identity, rather than copying Candy AI
- Consistent rose-gold/ink editorial typography, animated cover art with a reduced-motion toggle, on-screen model status, cinematic transitions and responsive layout testing.
- Quality controls for 360px mobile, tablet, desktop, low-end GPUs and keyboard/screen readers.
- User-controlled reminders and thoughtful character continuity; avoid coercive or deceptive retention loops, misleading live-person claims and artificial scarcity.

## Known high-priority engineering weaknesses

1. **Hosted generation is not provisioned by frontend code alone.** Live end-to-end tests and usage policy/contract checks for each model are outstanding.
2. **Provider credentials may be stored in localStorage.** That is a sensitive exposure risk on shared devices or in the event of injected scripts. Prefer encrypted OS keychain in the desktop build, and server-side credential storage for hosted service.
3. **Local-first storage is not automatically encrypted or permanent.** Provide durable backup/delete, privacy protections and accurate claims.
4. **Adult media source checking is currently self-attestation in browser flows.** A production backend must verify ownership, eligibility and abuse controls.
5. **Desktop auto-update signing** remains owner-configured; never commit the private signing key or generate it inside untrusted web code.
6. **Tests** should cover real hardware and actual image/video/speech outputs, not merely build success and port checks.

## Competitive product ideas (do not copy code or art)

- Kindroid official documentation covers calls that preserve context, video selfies and group conversations: https://kindroid.ai/v2/docs/voice-calls-and-video-calls/ ; https://kindroid.ai/v2/docs/selfies-video-selfies-avatars/ ; https://kindroid.ai/v2/docs/groupchats/
- Nomi official site emphasizes persistent memories, voice conversations and group chats: https://nomi.ai/
- Avoid treating marketing descriptions as technical proof or license to reuse images/designs.

## Release readiness gates
- [ ] Configure signing secrets and publish a verified signed release; test upgrading from previous signed version.
- [ ] Real inference test for every model selection and region.
- [ ] Real video output verified as generated frames, not a canvas effect.
- [ ] Server-side adult-policy, user consent and age-assurance checks.
- [ ] Private storage retention/export/delete, account security, payment/refund integration.
- [ ] E2E UX, responsive visual QA, accessibility review, performance and crash reporting.
