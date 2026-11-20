# VelvetMotion AI — Product, Experience and Model Roadmap

## Reference and positioning

Competitive inspiration: [Kinkly's AI-girlfriend comparison](https://blog.kinkly.com/ai-models/the-21-best-ai-girlfriends-%F0%9F%92%95/) and the broader consumer experience of AI-companion apps such as Candy AI. Use feature categories, **not** their branding, art, exact copy, layout, or assets.

**Brand promise:** VelvetMotion is a premium private-first studio for original adult AI companions: discover, create, chat, hear, photograph, animate. Real model reliability matters more than neon effects or fake demo media.

**Visual direction:** obsidian backgrounds, soft rose accent for emotional actions, lilac for storytelling, cyan reserved for *technical* engine status. Large legible portrait-led discovery cards; fewer animations, more intentional whitespace. Create a distinct brand instead of mimicking Candy AI pixel-for-pixel.

## Journey: from first visit to repeat use

1. **Welcome & age verification:** explain fictional adult-only content, what runs on-device vs through third-party cloud providers, and a real age-verification mechanism. A self-checked 18+ box is *not* a sufficient production identity or age-eligibility control.
2. **Discover:** show persona, voice availability, experience tags, and what is live or still demo. Fast filters; no fabricated 'online now' or generation status.
3. **Build a companion:** name, fictional adult avatar or permitted original artwork, style, personality, backstory, voice, and memory. Preview static template art honestly; only label **AI generated** if it came from an actual model.
4. **Talk:** streaming model replies, an interrupt button, per-companion memories, editable scene context, and scenario controls. Show the actual response engine or a clear error. Never pretend the fallback model responded.
5. **Media Studio:** upload original fictional artwork, generate portraits, or animate a source photo through an actual video model. Keep still-image animation clearly marked; never charge for fake AI generation.
6. **Voice:** natural neural TTS with per-character voice presets, listening / speaking / processing indicators, interruption and audio device controls.
7. **Bring-your-own-hardware:** provide verified installer assets and a helper connecting local Ollama/KoboldCpp/ComfyUI/Kokoro. Offer efficient/balanced/expressive text budgets for user's running local model.

## Implemented in PR #6

- Correct provider routing with realistic inference and neural voice timeouts.
- Distinguish browser narration from successful local neural audio.
- On-demand media generation in character gallery; show real errors.
- Better video endpoint contract, accurate animated-still labels, and no imaginary per-frame generation charges.
- Imported-image support (PNG/JPG/WebP) and Character Card V2 JSON parsing in Media Studio; size/type validation.
- Permission-aware **upload → animation** flow with explicit source type and rights confirmation; fictional original characters can be saved to personal roster.
- Scene Director: selectable high-level adult fictional drama/romance themes including affairs, consensual non-monogamy, cuckold dynamics, and interracial romance without racist stereotypes.
- Editorial home navigation and improved brand messaging.
- Local performance settings linked to actual local LLM response budgets; estimates are not hardware guarantees.
- Removal of misleading privacy, font-deployment, and unavailable-backend claims.

## Adult content boundaries and trust

- **All characters and sexual scenarios:** fictional adults only; user must be age-verified before adult mode. Respect consent, platform/provider policies, and jurisdiction.
- **Real-person photographs:** require demonstrable rights/consent and all subjects being adults. The current UI permits **nonsexual animation only** from such uploads. Do not offer face swaps, nude conversions, or sexualized real-person transformations.
- **Uploads:** user confirmation alone is not verification. Production requires server-side content assessment, secure private storage, deletion, rate limiting, reporting, and an abuse response mechanism.
- **Racialized scenarios:** avoid racist stereotypes, dehumanization, or real-person targeting. Fictional interracial relationship plots can be represented by individual adult characters with agency and boundaries.
- **Private data:** do not claim zero-server-logging while Firebase / optional cloud providers are involved. Clarify data sent to chosen engines, provide clear retention/deletion behavior, encryption and access control.
- **Billing:** adult-oriented billing depends on processor terms and a compliant provider. Store no private payment credentials in client code.

## Next engineering milestones (not done by this PR)

### P0: Launch trust and infrastructure
- Add a genuine backend and real age/consent verification, server-side moderation and retention/deletion. Tighten Firestore rules, remove unused expansive Google OAuth scopes, and run a third-party security audit.
- Deploy user-selectable **compatible** hosted inference: chat service, TTS, image generation, and a queued video workflow. Keep API keys server-side. Only offer capabilities a model and hosting agreement permit.
- Attach observable job states (queued, running, complete, failed, cancelled) and cost estimates for expensive generations. Video requires output URLs with authenticated storage and expiry.
- Add provider health tests and an end-to-end test that confirms an actual image, speech audio, and video file, not an HTTP 200 from a placeholder.

### P1: Quality
- **Chat:** token streaming, smarter memory summarization, prompt-injection defenses, long-context testing, scenario branching, retry/edit/regenerate, and per-character style controls.
- **Voice:** optional neural voices from licensed providers; prosody settings, silence/interrupt behavior, captions, playback controls and microphone permissions.
- **Images:** image-reference-aware workflows (e.g. an approved identity adapter) for *fictional* companions; negative prompts and saved seeds; quality/resolution choices based on real capability.
- **Videos:** real image-to-video workflow queue, motion intensity, source image previews, subtitles, reproducible settings, private export; show examples accurately labeled.
- **User library:** per-companion history, albums, optional encrypted backups, selective export/delete, content-moderation appeal workflow.

### P2: Product experience and growth
- Consensual fictional story packs and scene branches; multi-character narratives, meaningful relationship arcs, and user-owned memories.
- Mobile quick actions, screen-reader support, keyboard focus, reduced-motion support, user-controlled text size, and adaptive network usage.
- Transparent credit pricing, usage ledger, retries without double charging, fair offline/free tiers, and a clear cancel/refund path.
- Desktop model installer with integrity checks and explicit permission controls for local filesystem/GPU use; never assume a website can access arbitrary RAM.

## Acceptance criteria

- **Upload:** valid images/JSON import without throwing; unsupported types and oversized files show a clear error. Real-image animation requires affirmative rights consent and nonsexual prompts.
- **Character creation:** fictional-art upload appears in user's private roster with a working chat route.
- **Images:** gallery click generates or displays actionable error; no repeated static thumbnail presented as freshly generated media.
- **Video:** configured backend receives actual source + motion prompt. A true video and animated-still preview have different labels and downloads. Temporary blob URLs are not falsely marked 'saved permanently'.
- **Voice:** speak() only reports successful playback if audio actually played; fallback is labeled Browser Voice.
- **Chat:** a provider outage visibly fails rather than producing fabricated model text; local-only selection never silently routes to cloud.
- **Local mode:** changing power setting alters actual local chat max tokens / timeouts; never claims native GPU allocation.
- **Build:** GitHub Actions lint, typecheck, static production build pass on the PR head. Real media quality requires separate running-model tests.

> This is an implementation roadmap, not a claim that remote adult generation providers, age verification, billing, or local model installers are already operational.
