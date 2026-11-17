# VelvetMotion AI

Candy.ai / AIGirlfriends-style platform: chat, real portraits, nudes, sex-video sequences, goon room, daily feed, gifts, undress ladder.

**Fictional adults 21+ only.**

## Run

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

http://localhost:3000 → age gate → **Log in** → Meet the girls / Goon Room / Create girl.

## Deploy (Vercel)

Import this repo on [vercel.com/new](https://vercel.com/new). Optional env:

```
XAI_API_KEY=
AI_CHAT_ENDPOINT=
AI_CHAT_API_KEY=
AI_IMAGE_ENDPOINT=
AI_VIDEO_ENDPOINT=
AI_VIDEO_API_KEY=
```

Zero keys = free Pollinations chat + images + 4-frame video sequences.

## Features

- **12 companions** with live Pollinations portraits (not blank SVGs only)
- **Local login** required for chat & generate
- **Chat memory** synced per girl (localStorage)
- **Intimacy meter** + she texts first when high
- **Undress ladder**: portrait → lingerie → nude → video → explicit by intimacy %
- **Dual-girl** generate option
- **Gifts** (coins) she remembers
- **Daily feed** on home
- **Goon Room** timed sessions (1–2 girls)
- **Create girl** wizard: look, personality, relationship RP, photo upload
- **Gallery**, tributes, JOI, story packs
- **Sex video**: 4-frame cinematic sequence; real MP4 via `AI_VIDEO_ENDPOINT`

## Limits

- Pollinations rate limits (~30s between heavy gens)
- No real Instagram person cloning (upload your own reference art only)
- Sync is per-browser until you add Supabase
