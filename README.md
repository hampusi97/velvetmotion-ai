# VelvetMotion AI

Candy.ai-style AI girlfriend site — **100% free** (Pollinations for chat, images, and 4-frame video sequences). No credit card. Fictional adults **21+ only**.

Live: [velvetmotionai.vercel.app](https://velvetmotionai.vercel.app)

## Quick start

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

http://localhost:3000 → age gate → **Log in** → Girls / Discover / Goon Room / Create / Roulette / Blindfold.

## Deploy (Vercel)

Import this repo on [vercel.com/new](https://vercel.com/new). Zero env vars required for the free experience.

Optional (see `.env.example`):

| Var | Effect |
|-----|--------|
| `XAI_API_KEY` / `AI_CHAT_*` | Better chat model |
| `AI_IMAGE_*` | Custom image API |
| `AI_VIDEO_*` | Real MP4 instead of still sequences |
| Firebase keys | Google sign-in + cloud sync |

## Features

- **30+ companions** — dense roster, unique personalities & kinks
- **Experiences home** — Create, Discover, Roulette, Blindfold JOI, Goon Room, Tribute
- **Discover swipe** — Tinder-style, Super Like, lingerie peek, match modal
- **Create your girl** — multi-step Candy-style wizard (look, eyes, chest, personality, photo seed)
- **Chat + intimacy ladder** — free LLM, gifts she remembers, delayed nudes, aftercare hooks
- **One-tap Generate** — Lingerie / Nude / Explicit / Sex video buttons + dual-girl
- **4-frame sex sequences** — cinematic stills (real MP4 when `AI_VIDEO_ENDPOINT` is set)
- **Goon Room** — timed 1–2 girl sessions
- **Roulette** — random girl + tribute, 8-minute sprint
- **Blindfold JOI** — audio-only until intimacy unlocks reveal
- **Retention** — daily claim (+100), edging streak, featured dual pair, fantasy codes, private vault
- **Story + JOI packs**
- **Optional Firebase** — Google sign-in + cloud sync

Everything above works on the free tier today.

## Stack

Next.js 15 · React 18 · Tailwind · Framer Motion · Pollinations · Firebase (optional)

## Notes

- All characters are fictional adults. No real-person likenesses.
- Image/video quality depends on Pollinations availability; seeds keep faces consistent per girl.
- Login (local or Firebase) is required for chat and generate.
- Free Pollinations has rate limits — wait ~30s if a generation stalls.
