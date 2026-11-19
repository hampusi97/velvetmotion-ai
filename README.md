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

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → **velvetmotion-ai** → Settings → Builds
2. Connect to Git → select `hampusi97/velvetmotion-ai` → branch `main`
3. Build command: `npm run build` · Output: `.next`
4. Every push to `main` updates https://velvetmotion-ai.pages.dev

## Deploy (Vercel)

Import this repo on [vercel.com/new](https://vercel.com/new). Zero env vars required for the free experience.

Optional (see `.env.example`):

| Var | Effect |
|-----|--------|
| `XAI_API_KEY` / `AI_CHAT_*` | Better chat model |
| `AI_IMAGE_*` | Custom image API |
| `AI_VIDEO_*` | Real MP4 instead of still sequences |
| Firebase keys | Google sign-in + cloud sync |

## Features (current)

- **30+ companions** — unique Pollinations portraits per girl (no shared faces)
- **CharacterChat** — vault notes, NSFW chips (Lingerie / Nude / Explicit / Sex sequence), gifts, intimacy ladder, voice
- **Create your girl** — multi-step wizard + photo seed
- **Share & Import** — localStorage share codes (`lib/shareGirls.ts` + `ShareImport` UI)
- **Blindfold JOI** — visual girl grid, Classic JOI / SPH modes, sequence reveal at intimacy ≥ 55%
- **Goon Room** — 1–2 girl timed sessions, streak, dual-girl prompts
- **Story packs** — romance + **BNWO / SPH / cuck** interactive packs
- **Discover swipe**, Roulette, Tribute, JOI browser, Story browser
- **Retention** — daily claim, edging streak, fantasy codes, private vault

## Roadmap / ideas from research

Drawn from Candy.ai, Nomi, Kindroid, MyGirlGPT, openroleplay, AIRI, HerAndHim, Aikeya, my-raze, etc.:

- One-tap Nudify / Sex / JOI after Create
- Dual-girl chat thread
- Proactive messages (she texts first)
- Long-term multi-tier memory (Nomi-style)
- Live2D / VRM avatar option (AIRI / Aikeya)
- Telegram / Discord bridge (MyGirlGPT pattern)
- Optional WebLLM browser-side inference (zero server cost)
- Relationship stages + affection axes
- Scene-matched selfies that stay face-consistent

## Stack

Next.js 15 · React 18 · Tailwind · Framer Motion · Pollinations · Firebase (optional)

## Notes

- All characters are fictional adults. No real-person likenesses.
- Image/video quality depends on Pollinations availability; seeds keep faces consistent per girl.
- Login (local or Firebase) is required for chat and generate.
- Free Pollinations has rate limits — wait ~30s if a generation stalls.


## Deployment status (Nov 2026)

Full feature set is on `main` and ready for the next Vercel deploy of the **velvetmotion-ai** project:

- ~57 unique companions with face-seed locked portraits
- Discover swipe + create your own profile (gender / looking-for / bio)
- Create girl wizard → undress → chat → Open in 3D
- Character chat with intimacy, gifts, NSFW chips, pin-to-vault
- 3D stage: dual body, sex/breed/cuck/BNWO, hands-free (auto voice + auto advance), voice packs
- Image generation via Pollinations (beauty → lingerie → nude → explicit → sex)
- Video sequences (sex / JOI / SPH / BNWO); real MP4 optional via img2vid endpoint

**Note:** The public domain `velvetmotionai.vercel.app` currently serves an older project. Redeploy the `velvetmotion-ai` Vercel project from latest `main` to go live with everything above.
