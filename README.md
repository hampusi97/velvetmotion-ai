# VelvetMotion AI

**Candy.ai-style AI girlfriend platform** — chat, nudes, explicit images, cinematic sex-video sequences.

Combined from greger (static NSFW demo + coins), velvetmotion-ai (characters + Next.js app), and velvetmotionai (API patterns).

**Fictional adults 21+ only.**

## Zero-config free stack

| Feature | Default (no keys) | Upgrade |
|--------|-------------------|--------|
| **Chat LLM** | Pollinations free text API | `XAI_API_KEY` or OpenAI-compatible |
| **Nudes / explicit** | Pollinations Flux + enhance | `AI_IMAGE_ENDPOINT` (SD/Comfy) |
| **Sex video** | Multi-frame cinematic sequence | `AI_VIDEO_ENDPOINT` (fal / Runway / Comfy) |
| **Coins** | 500 local coins, generations cost coins | Demo top-up in Gallery |
| **Gallery** | localStorage persistence | — |

## Run

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

Open http://localhost:3000 → age gate → **Meet the girls** → chat → **Generate**.

## Optional `.env.local`

```bash
# Better chat (optional)
XAI_API_KEY=
AI_CHAT_ENDPOINT=https://api.openai.com/v1
AI_CHAT_API_KEY=
AI_CHAT_MODEL=gpt-4o-mini

# Real motion video (optional)
AI_VIDEO_ENDPOINT=
AI_VIDEO_API_KEY=

# Custom image backend (optional)
AI_IMAGE_ENDPOINT=
AI_IMAGE_API_KEY=
```

## Product surface

- 8 original companions with voice, kink, and system prompts
- Live free chat out of the box (Pollinations + local fallback)
- Generate panel: portrait · lingerie · nude · explicit · sex video
- Coin economy for media (chat free)
- Persistent gallery of generated nudes / sequences on-device
- Images appear in-thread; video mode returns a 3-frame sequence
- JOI browser, story packs, TTS speak buttons
- Editorial dark UI

## Deploy

Vercel or Netlify → import repo → `npm run build` → add env vars if any.

## Honest limits

- Free Pollinations is **rate-limited** (wait ~30–45s between gens if throttled).
- **True high-quality motion sex videos** need a paid video API (`AI_VIDEO_ENDPOINT`). Free mode delivers enhanced cinematic stills/sequences, not Hollywood MP4s.
- All characters are fictional adults 21+.
