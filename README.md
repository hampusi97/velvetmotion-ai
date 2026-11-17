# VelvetMotion AI

Candy.ai-style AI girlfriend site — **100% free tier** with Pollinations (chat, images, 4-frame video sequences).

Fictional adults **21+ only**.

## Quick start

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

http://localhost:3000 → age gate → **Log in** → Girls / Discover / Goon Room / Create.

## Deploy (Vercel)

Import this repo on [vercel.com/new](https://vercel.com/new). Zero env vars required.

Optional (see `.env.example`):

| Var | Effect |
|-----|--------|
| `XAI_API_KEY` / `AI_CHAT_*` | Better chat |
| `AI_IMAGE_*` | Custom image API |
| `AI_VIDEO_*` | Real MP4 instead of still sequences |

## Features

- **Discover swipe** — Tinder-style deck, drag cards, spicy peek, match modal
- **Roster** — live high-quality portraits (not blank SVGs)
- **Chat** — free LLM + intimacy + gifts + undress ladder
- **Generate** — portrait → lingerie → nude → explicit + dual-girl + sex-video frames
- **Daily claim** — +75 coins / day
- **Goon Room** — timed 1–2 girl sessions
- **Create girl** — look, personality, relationship RP, photo upload
- **Tributes / JOI / stories / vault**
- **Optional Firebase** — Google sign-in + cloud sync when configured

## Stack

Next.js 15 · React 18 · Tailwind · Framer Motion · Pollinations · Firebase (optional)
