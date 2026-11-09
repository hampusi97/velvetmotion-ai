# VelvetMotion AI

NSFW AI Girlfriend / Fantasy platform built for maximum addiction.

## Features

- **Age Gate** – Simple 18+ confirmation (persists)
- **Login System** – Required for most features (demo email/password, persists)
- **Unlimited Chat & Generations** – Text chat + all photo/video generation are always free
- **Homescreen Dashboard** – Easy access to every function
- **Crush Helper** – Upload any photo → generate explicit photos & videos of her (free)
- **Rejection Revenge** – Upload a Tinder screenshot of a girl who rejected you
- **Story Packs** – One-tap BNWO, Cuck, Blacked, Taboo scenarios
- **JOI Center** – Classic, SPH, CEI, Ruin, Edge, Cuck, Blacked, Findom, Voice
- **Tinder Roleplay** – Play as her or talk to her as the beta
- **BNWO Section** – Dedicated Black New World Order training
- **Group Chat** – Multiple girls talking about the beta
- **Personal Gallery** – Every photo & video is saved
- **Saved Sessions** – Resume any previous JOI or story
- **Tribute System** – Cum on pics → she notices and reacts
- **Streak Counter** – Daily open increases streak
- **Coins** – Daily free coins + bonus coins for sharing your link
- **Forum** – Paid unlock ($9.99/month demo). Other users’ girls and posts
- **Affiliate Program** – Shareable referral link. Earn 30% of Forum payments + free coins when you share
- **Leaderboard** – Demo top referrers
- **Daily Messages** – “She sent you something”

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Important

- 18+ only
- Real generation requires NSFW image/video APIs + uncensored LLM
- Using real people’s photos without consent is illegal in many places
- Always frame as fantasy / fictional characters for legal safety
- Login, payment, coins, and affiliate tracking are currently demo (localStorage). Replace with real auth + Stripe + Stripe Connect for production.

## Stack

- Next.js 15 + TypeScript + Tailwind
- localStorage for everything (swap to a real backend later)

## Roadmap

1. Real LLM endpoint (`/api/chat`)
2. Real image + video generation
3. Real auth (Clerk or Supabase)
4. Real Stripe Checkout + Stripe Connect for affiliate payouts
5. Persistent memory per girl
