# VelvetMotion Private Atelier — Competitive Experience Research

Last research pass: 2026-11-20 (reference links may evolve). This document guides **original UX and engineering**, not copying competitor source, art, names, or design assets.

## Sources and useful patterns

| Platform | Primary sources | Experience pattern worth learning from |
|---|---|---|
| [Candy AI](https://candy.ai/) | Official site | A single clear journey from discover → create → chat → media; quick access to text, voice, images and videos |
| [Kindroid](https://kindroid.ai/v2/docs/selfies-video-selfies-avatars/) | Official help: [selfies, video selfies and avatars](https://kindroid.ai/v2/docs/selfies-video-selfies-avatars/), [voice and calls](https://kindroid.ai/v2/docs/voice-calls-and-video-calls/), [chat features](https://kindroid.ai/v2/docs/chat-features-and-tools/) | Reference-anchored fictional avatars, voice personalization, media generated from a chat and responsive calls |
| [Nomi](https://nomi.ai/) | Official product site | Strong emphasis on continuity, shared memory, group interactions and natural conversation |
| [Kinkly AI companion overview](https://blog.kinkly.com/ai-models/the-21-best-ai-girlfriends-%F0%9F%92%95/) | User-provided editorial benchmark | Compare product categories and different users' intentions; avoid relying on rankings as proof of model capability |

Do not assume competitor marketing claims are independently verified. Confirm model support, pricing, age eligibility, legal requirements, and provider terms before shipping similar features.

## VelvetMotion differentiator

**Editorial luxury + user choice + honest inference.** Make adult fictional companionship feel like a private creative studio, not a cluttered arcade. Explain the real capabilities of each installed provider. **Local-first is optional**: power users can connect their own machine, but a browser alone does not run arbitrary downloaded LLMs in native RAM. Hosted visitors need separately operated inference servers.

### Visual system
- Obsidian and ink surfaces with rose/champagne accents and small lilac highlights.
- Elegant display headlines paired with a clean UI font; readable text contrast, large touch targets, strong keyboard focus.
- Portrait-led discovery and motion previews using existing authorized fictional imagery.
- Limited continuous animations, always pausable, honoring reduced-motion preferences.
- Honest labels: *animated still*, *neural voice*, *browser voice*, *generated image*, *provider offline*.
- Never advertise a fake real-time call, live human presence, or "uncensored" provider if the connected model is unavailable.

### Flow to win on
1. **Find a persona:** filters by tone, relationship, age (adults), animation/voice support and creator style.
2. **Try a conversation:** low friction, model provider visible, no canned success when inference fails.
3. **Direct the story:** user-invoked high-level fictional romance, affair drama, jealousy, consensual non-monogamy, cuckold dynamics and other relationship stories. No racial stereotypes, degradation or coercion.
4. **Make fictional art:** upload original fictional-adult artwork, confirm rights, choose mood, then use a reference-aware image model. Prove that new pixels were generated before charging.
5. **Animate:** 3s/5s/8s motion clip with real video model, or an explicitly labeled pan/zoom preview.
6. **Create a voice:** choose voice identity/preset plus controllable pitch and pace, audition against device voice or available licensed neural voice. A true custom voice trained on samples requires separate consent-verified infrastructure.
7. **Own the experience:** download/export, manage private library, delete source, control cloud/local routes and avoid exposing personal uploads by default.

## Added to draft PR #6
- New **CinematicPortraitShowcase**: premium moving cards, pointer glow, pause/reduce-motion controls and honest preview labels.
- New **VoiceDesigner**: six named synthetic female-style presets, pitch/pace tuning, instant local-device preview and optional Kokoro neural preview. The selected voice is saved in Create and Studio companion records.
- **Media Studio** now distinguishes original fictional adult art and own real-life adult selfies. Real selfies support only nonsexual animation; original fictional art can request adult-mode compatible img2img and video.
- **Reference image adapter**: configured image-to-image endpoint or compatible local ComfyUI, with explicit user click and visible provider errors, not fabricated output.
- Enhanced interactive story modes and a cleaner homepage experience.

## Next implementation priorities

### P0 — Make generation real, observable, and safe
- **Production backend** for generation queues, rate limits, authentication, private image storage, content policy and true age assurance.
- **Model jobs:** queue → progress → finished/failed/cancelled, retries, cost estimation, latency and failure analytics. Secure server-side provider credentials; no direct adult model keys in client bundle.
- **Real-model tests:** conversational model returns meaningful distinct text, TTS produces playable speech, image output is a new image, video has multiple generated frames—not an animated single still.
- **Upload provenance:** user declarations are not sufficient verification for real-person adult identity and consent. Production server must enforce rules, scan content, track consent evidence when appropriate, and support abuse reporting/deletion.
- **Audio privacy:** only clone a voice when the speaker has provided an independently verifiable recording and explicit consent for that use; include revocation and deletion. No celebrity impersonation or borrowed recordings.
- **Adult-mode billing:** select a provider whose rules permit the *actual* products, and confirm hosting, legal and privacy obligations.

### P1 — AAA product depth
- **Realistic conversations:** streaming typewriter display, reversible edits, branching story replay, persistent user-controlled memory journal, and character-specific style prompts.
- **Voice:** waveform playback, captions, interruptible calls, per-character saved voice, licensed model voices, prosody controls and voice-quality tests.
- **Reference media:** image import provenance, seed history, comparison slider, shot composer, angle/outfit/lighting presets, private image album, editable variants and non-destructive history.
- **Motion:** queue progress, motion strength controls, camera moves, prompt-to-motion, repeatable seeds, scene continuity, optional audio-lipsync if supported.
- **Living characters:** opt-in context-sensitive actions, scene chapters, relationship arcs, adult group stories, configurable boundaries and end-of-scene summaries.
- **Native desktop:** tested signed Windows/Mac/Linux release installers with RAM/VRAM recommendations; verify binaries and do not imply running local models when none are installed.

### P2 — Product fit rather than compulsive retention
- User-controlled notifications, explicit pause/quiet hours, optional favorites and saved story chapters.
- Accessible gesture controls, loading skeletons, error recovery and responsive image layouts.
- Transparent usage and token balances, fair refunds when a generation fails, and clear upgrade value.
- No artificial FOMO, fake "live" indicators, covert emotional pressure, or punitive streak mechanisms.

## Definition of done for the new uploads

1. Image/JSON file validation is consistent, quick, and visible.
2. Source is classified as either original fictional adult artwork or the user's own selfie.
3. Adult mode is **only available for original fictional adult source art** and provider policy permits it.
4. For original fictional art, user can request a reference-aware image variation and then animate it; no silently substituted static portrait.
5. For real selfies, prompt is forced to nonsexual framing and adult mode is disabled. The backend must independently enforce this in production.
6. Model outages show actionable errors and never spend credits for fake media.
7. Audio preview and saved voice preferences actually affect newly created fictional companions.
8. UI remains usable with motion off, screen readers and keyboard navigation.

## November 20 follow-up

| Reference | What to apply in VelvetMotion |
|---|---|
| [Candy AI video builder](https://everai.zendesk.com/hc/en-us/articles/64285000268057-What-is-Build-Your-Video) | Let a user assemble a scene from a few choices, then refine the exact prompt before sending it. |
| [Kindroid selfie and video tools](https://kindroid.ai/v2/docs/selfies-video-selfies-avatars/) | Make the first frame a visible part of the video flow. Carry a selected portrait or generated photo through to the clip. |
| [Nomi](https://nomi.ai/) and [SillyTavern World Info](https://github.com/SillyTavern/SillyTavern-Docs/blob/main/Usage/worldinfo.md) | Give each fictional companion a distinct persona and let users edit the memories or lore that carry between scenes. |
| [Wan2.2](https://github.com/Wan-Video/Wan2.2) and [LTX-Video](https://github.com/Lightricks/LTX-Video) | Benchmark image-to-video workflows on the same portraits. Wan lists 480p and 720p image-to-video support. LTX includes reference and keyframe options. Record actual output dimensions and model policy for the workflow in use. |

The After Hours collection tests three archetypes with original fictional adults. Imani is a jazz lounge host, Renata a surf coach, and Celeste a costume designer. Use opt-in aggregate measures, such as profile-to-chat starts and repeat visits, before promoting an archetype as popular.

Next priorities are a one-tap path from a character's chat to a scene draft, private render history with prompt and first-frame reuse, and a side-by-side model benchmark for facial consistency, flicker, motion, latency, and cost.

## Archetype collection

| Public reference | VelvetMotion interpretation |
|---|---|
| [Candy AI's goth profile](https://candy.ai/fr/ai-girlfriend/lila-crazy) and [Joyland's goth-roommate listing](https://www.joyland.ai/chat/5xMY2) | Give goth characters an immediate voice and a specific subculture. Mara is an analog photographer and Vesna is a darkwave DJ. |
| [Character.AI's sorority-president listing](https://character.ai/character/5g1glGEn/sage-morgan-burke-college-leader) and [Talkie's sorority profile](https://www.talkie-ai.com/chat/chloe-sterling-169111) | Put the social-leader archetype in a scenario with an immediate invitation. Blair hosts a gala and Jade produces the opening of a community art project. Both are adult alumnae. |
| [CandyShorts' blended-family setup](https://candy.ai/candy-shorts/series/darkangel666) | Adapt the tension around a family gathering into an original storyline. Rowan is the bride’s adult stepdaughter. Morgan is the bookstore owner’s adult stepdaughter. The user meets them as an unrelated wedding guest or local collector. |

The public Character.AI listing displayed about 209,000 interactions. Other sites use different counters and promotion strategies. The references establish that these archetypes are visible, while opt-in VelvetMotion usage can show which new characters people actually return to.

### Mature scene and guided audio follow-up

[Character.AI's goth tattoo artist listing](https://character.ai/character/AVd7dXt6/flirty-goth-tattoo-artist-ella) displayed about 568,000 interactions. [Candy AI's public catalog](https://candy.ai/ai-girlfriend) emphasizes different personalities and conversation styles. Veda uses the tattoo-studio archetype with an original botanical art background. Noor and Juno add a luxury perfumer and a burlesque choreographer to test different kinds of confident, creative adult characters.

Every flagship companion has at least one 18+ Studio photo preset and a three-cue guided script. The JOI builder has optional kink themes for AI-generated drafts. The interracial romance theme focuses on mutual attraction and equal agency. The mature portrait and guided-session settings use unrelated fictional adult participants.
