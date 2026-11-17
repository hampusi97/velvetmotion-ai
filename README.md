# VelvetMotion AI

**Unified AI companion platform** — characters, chat, nudes, explicit images, and video generation.

All content is fantasy. Fictional adults 21+ only.

## What’s included

| Feature | How |
|--------|-----|
| **8 companions** | Maren, Liora, Tess, Isolde, Briony, Nadine, Vesper, Calla |
| **Chat** | Live via `XAI_API_KEY` or `AI_CHAT_API_KEY` + endpoint; else rich local fallback |
| **Nude / explicit images** | `/api/generate-image` → Pollinations (free) or `AI_IMAGE_ENDPOINT` |
| **Sex video** | `/api/generate-video` → `AI_VIDEO_ENDPOINT` or cinematic still |
| **JOI / Story packs** | Built-in browsers |
| **TTS** | Browser speechSynthesis per character voice |

Merged capabilities from **greger** (media UX), **velvetmotionai** (API patterns), and this repo’s character writing.

## Quick start

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

Open http://localhost:3000

## Environment (optional)

Create `.env.local`:

```bash
# Live chat (pick one)
XAI_API_KEY=xai-...
# or
AI_CHAT_ENDPOINT=https://api.openai.com/v1
AI_CHAT_API_KEY=sk-...
AI_CHAT_MODEL=gpt-4o-mini

# Optional custom image backend (else Pollinations)
AI_IMAGE_ENDPOINT=
AI_IMAGE_API_KEY=

# Optional real video worker (fal / Runway / Comfy)
AI_VIDEO_ENDPOINT=
AI_VIDEO_API_KEY=
```

Without keys, chat uses local character replies and images still work via Pollinations.

## Deploy

**Netlify / Vercel:** import this repo, build `npm run build`, set env vars in the dashboard.

## Related

- `greger` — static single-file demo of the same media flows
- `velvetmotionai` — alternate stack with BTC/VIP experiments
