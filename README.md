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

## Features (Candy-inspired, more fun)

- **30+ companions** — dense roster across ethnicities, body types, ages 22–41, personalities (Dominant / Shy / Brat / Nurturing / Playful / Intense / Romantic / Bold)
- **Experiences home** — big visual cards for Create, Discover, Roulette, Blindfold JOI, Goon Room, Tribute
- **Discover swipe** — Tinder-style deck, drag cards, spicy peek, match modal
- **Live portraits** — Pollinations Flux seeds per girl + mood (beauty / lingerie / nude / explicit / seductive)
- **Chat + intimacy ladder** — free LLM, gifts, undress progression, delayed nudes, aftercare mode
- **Generate** — portrait → lingerie → nude → explicit + dual-girl scenes + 4-frame “sex video” sequences
- **Create your girl** — multi-step Candy-style wizard (style, look, eyes/chest/hair, personality, relationship, kink, optional photo seed) with live preview
- **Retention loops** — daily claim (+coins), edging streak meter, featured pair, fantasy codes, private vault (PIN), proactive-style feed
- **Goon / Roulette / Blindfold JOI** — timed sessions, random girl + tribute sprint, audio-only JOI that reveals with intimacy
- **Story packs + JOI packs** — browsable content libraries
- **Optional Firebase** — Google sign-in + cloud sync when configured

Everything above works on the free tier today.

## Stack

Next.js 15 · React 18 · Tailwind · Framer Motion · Pollinations · Firebase (optional)

## Notes

- All characters are fictional adults. No real-person likenesses.
- Image/video quality depends on Pollinations availability; seeds keep faces consistent per girl.
- Login (local or Firebase) is required for chat and generate to keep the experience personal.
- Free Pollinations has rate limits — wait ~30s if a generation stalls.
