# VelvetMotion AI

**Candy.ai-style AI girlfriend platform** — chat, nudes, explicit images, cinematic sex-video sequences.

**Fictional adults 21+ only.**

## Quick start

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

Open http://localhost:3000 → age gate → **log in** (local username) → Meet the girls → Generate.

## Deploy (recommended: Vercel)

1. Push this repo to GitHub (already done if you own it).
2. Go to [vercel.com/new](https://vercel.com/new) → Import `hampusi97/velvetmotion-ai`.
3. Framework: Next.js · Build: `npm run build` · Output: default.
4. (Optional) Environment variables:

```
XAI_API_KEY=
AI_CHAT_ENDPOINT=
AI_CHAT_API_KEY=
AI_CHAT_MODEL=gpt-4o-mini
AI_IMAGE_ENDPOINT=
AI_IMAGE_API_KEY=
AI_VIDEO_ENDPOINT=
AI_VIDEO_API_KEY=
```

5. Deploy. Free Pollinations works with **zero keys**.

### Netlify

```bash
npm run build
# Publish directory: .next (or use Netlify Next runtime)
```

`netlify.toml` is included. Enable Next.js runtime in Netlify settings.

## Free stack (no keys required)

| Feature | Default | Upgrade |
|--------|---------|--------|
| Chat | Pollinations free text | `XAI_API_KEY` or OpenAI-compatible |
| Nudes / explicit | Pollinations Flux + enhance | `AI_IMAGE_ENDPOINT` |
| Sex video | 3-frame cinematic sequence | `AI_VIDEO_ENDPOINT` (fal / Runway) |
| Login | Local username (device) | Swap for Supabase/Auth later |
| Coins | 500 local | Demo top-up in Gallery |

## Product

- **12** original companions (added Sable, Rhea, Juniper, Dahlia)
- Local login gate before chat / generate
- Generate: portrait · lingerie · nude · explicit · sex video
- Coin economy + on-device gallery
- JOI, story packs, tributes, TTS

## Limits

- Pollinations is rate-limited (~30–45s between heavy gens).
- True motion MP4 needs `AI_VIDEO_ENDPOINT`.
- Login is **localStorage only** (per browser). No password server yet.
