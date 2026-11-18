# VelvetMotion — research map (repos + Candy.ai)

What we studied and what we reused vs still deferred.

## Candy.ai product patterns (2026)

| Feature | Candy does | VelvetMotion status |
|---------|------------|---------------------|
| Sidebar: Home / Chat / Create / Premium | Yes | Yes (desktop + mobile bottom nav) |
| Vertical Shorts series + genres | 29 series, free ep 1–2 | Catalog + genre chips; frame sequences |
| Live Action motion menu | XP unlocks, long clips | Preset chips → JOI/sex sequences (not 120s video) |
| Face-consistent photos | Strong | Seed + figure lock; IP-Adapter needs local Comfy |
| Voice notes + phone call | Token-priced | TTS + VoiceCallUI (Web Speech) |
| Create character multi-step | Girls/Anime, body, personality | CreateGirlWizard + face photo seed |
| Group / dual chat | Group button | Dual + Group components |
| Memory | Persistent prefs | Short/mid/long tiers + vault |
| Proactive contact | Soft | Idle toast + Notification API |

**Differentiation we keep:** free uncensored, Blindfold JOI, Goon Room, BNWO/SPH packs, share codes, local Ollama/Comfy hooks.

## Open-source repos used

| Repo | Reusable idea | Implemented |
|------|---------------|-------------|
| Synthintel0/MyGirlGPT | Telegram + local LLM + SD selfies | Telegram config UI + worker env template; Ollama route already |
| Lynpoint/CyberVerse | Voice-first, persona memory, WebRTC digital human | Voice call UI + memory tiers; WebRTC still heavy |
| OpenChara/OpenCharaAgent | Persistent agent, idle self-work, ST cards | Proactive idle; PNG/JSON card import |
| Haven AI Companion | Multi-tier memory, ST cards, local SD | memoryTiers + pngCardDecode |
| CharForge / consistent-prompts | One ref → consistent scenes | Face seed from Create; scene library |
| Fooocus / Comfy clients | Local uncensored gen | mediaSettings + comfyClient |
| openroleplay / open-character-ai | Discovery grid, auth, credits | Roster + login gate + coins |
| ai-character-studio | Portrait studio + chat hub | Create + gallery |
| vueuse useWebSocket | Real-time rooms | Lounge Firebase optional + localStorage |

## Do not reinvent

- **ST card format** — parse PNG `chara`/`ccv3`, don’t invent a new card schema.
- **Pollinations / Flux URLs** — free image path; local Comfy for uncensored face lock.
- **Web Speech** — voice call without Twilio until scale demands it.
- **Stripe SaaS boilerplates** — only if monetizing; we use soft tribute + coins first.

## Still heavy / next infra

1. True img2vid + IP-Adapter (GPU or paid API)
2. Telegram worker process (not browser)
3. WebRTC Live Action video
4. Firestore rules for `loungeRooms`
5. PWA install icons + push when tab closed (SW partially in place)
