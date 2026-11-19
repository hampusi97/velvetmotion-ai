# VelvetMotion AI

**Match \u2192 chat \u2192 3D.** Free NSFW AI companions \u2014 Pollinations for chat, images, and motion sequences. No credit card. Fictional adults **21+ only**.

Live: [velvetmotionai.vercel.app](https://velvetmotionai.vercel.app)

## Quick start

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

http://localhost:3000 \u2192 age gate \u2192 log in \u2192 **Home / Discover / Create / Chat / 3D**.

## Deploy (Vercel)

Import this repo on [vercel.com/new](https://vercel.com/new). **Zero env vars** required for the free stack.

Optional (see `.env.example`):

| Var | Effect |
|-----|--------|
| `XAI_API_KEY` / `AI_CHAT_*` | Better chat model |
| `AI_IMAGE_*` | Custom image API |
| `AI_VIDEO_*` | Real MP4 instead of still sequences |
| Firebase keys | Google sign-in + cloud sync |

## What\u2019s live

- **Discover swipe** \u2014 match \u2192 profile / chat, or **Meet in 3D**
- **Create your girl** \u2014 upload / camera / AI face \u2192 undress chips \u2192 **Sextext** or **Animate in 3D**
- **CharacterChat** \u2014 intimacy ladder, NSFW mood chips, pin-to-vault, \u201cshe\u2019s thinking\u2026\u201d, fallback replies
- **3D JOI stage** \u2014 library or upload girl, locations, poses, dual / breed, voice packs, WebXR entry
- **Vault** \u2014 local PIN, pin from chat media
- **Proactive** \u2014 she texts first (idle toast + Home inbox); memory-aware lines when you\u2019ve chatted before
- **Goon Room \u00b7 Blindfold JOI \u00b7 Roulette \u00b7 Dual / Group \u00b7 Shorts \u00b7 Story packs** (incl. SPH / BNWO / cuck)
- **Mobile** \u2014 thumb nav: Home \u00b7 Discover \u00b7 Create \u00b7 Chat \u00b7 3D

## Brand

- **Name:** VelvetMotion AI
- **Tagline:** Match \u2192 chat \u2192 3D. Private uncensored companions.
- **Palette:** near-black ink, pink \u2192 fuchsia heat, soft gold for wallet/vault
- **Legal:** age gate + Terms / Privacy / Safety in footer and pre-enter

## Stack

Next.js 15 \u00b7 React 18 \u00b7 Tailwind \u00b7 Framer Motion \u00b7 Three.js (3D stage) \u00b7 Pollinations \u00b7 Firebase (optional)

## Notes

- All characters are **fictional adults 21+**. No real-person likenesses.
- Faces stay consistent via per-girl seeds / figure strings.
- Free Pollinations has rate limits \u2014 retry / try another mood if a generate stalls.
- Login (local or Firebase) is required for chat and generate.

## Roadmap (post soft-launch)

1. Daily feed intensity tied to streak
2. Stronger face-lock on Extra/Hot casts
3. Optional fal.ai MP4 path when `AI_VIDEO_*` is set
4. Light coins monetization (already scaffolded \u2014 don\u2019t block launch)
5. PWA install polish + notification opt-in copy
