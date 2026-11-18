# VelvetMotion AI — Living Plan (Free Forever)

> Track what shipped vs what’s next. Update checkboxes when you merge.
> Last updated: 2026-11-18 · Policy: **no payments / no Stripe paywall** — core stays free.

Live: https://velvetmotionai.vercel.app/  
Repo: https://github.com/hampusi97/velvetmotion-ai

---

## Status legend
- [x] Done on `main`
- [~] Partial / needs one manual step
- [ ] Not started

---

## A. Product core (Candy parity, NSFW, free)

| Item | Status | Notes |
|------|--------|-------|
| Unique girl portraits (Flux + faceSeed) | [x] | `lib/media.ts` |
| CharacterChat + NSFW chips (Lingerie/Nude/Explicit/Sex/JOI/SPH/BNWO) | [x] | |
| Free-text “send me a selfie/nude/JOI…” | [x] | `lib/sceneRequest.ts` |
| CreateGirlWizard optional photo + AI portrait | [x] | |
| Blindfold JOI | [x] | |
| Tribute nudges + gallery | [x] | |
| Multi-tier memory | [x] | |
| Relationship stages | [x] | |
| Dual / group chat | [~] | Dual solid; group UI exists |
| User lounge | [~] | Code + rules in repo — **publish rules** |
| Shorts (all free) | [x] | + SPH / Blindfold series |
| Candy sidebar + mobile nav | [x] | `my-girls` + safety |
| Proactive messages | [x] | |
| Advanced Comfy / local media | [x] | |
| img2vid adapter | [x] | Sequence fallback |
| Optional Ollama chat | [x] | |

---

## B. Go-live free pack

| Item | Status | Notes |
|------|--------|-------|
| My Girls hub | [x] | view `my-girls` |
| Legal / Privacy / 18+ | [x] | views `terms` / `privacy` / `safety` |
| Generous free coins + GEN_COST | [x] | 1200 default, 200 daily |
| PLAN.md + DEPLOY_FIRESTORE.md | [x] | This checklist |
| **Publish firestore.rules** | [~] | See [DEPLOY_FIRESTORE.md](./DEPLOY_FIRESTORE.md) |

---

## C. Heavier / later

| Item | Status |
|------|--------|
| WebRTC live video | [ ] |
| Telegram / Discord worker | [ ] |
| WebLLM | [ ] |
| Live2D / VRM | [ ] |
| IP-Adapter face lock | [ ] |
| More story packs | [ ] |
| 3D suite depth | [ ] |

---

## You must do once (cannot be done from this agent alone)

1. **Firebase → Firestore → Rules → Publish** the repo `firestore.rules`  
   Full steps: [DEPLOY_FIRESTORE.md](./DEPLOY_FIRESTORE.md)
2. Confirm Vercel build is green after latest `main` pushes.
3. Signed-in test of **Lounge** on production.

Optional support wallet ($5) stays optional tips — not a paywall for NSFW features.

---

## Suggested next 3

1. Publish Firestore rules + test Lounge.
2. Watch Vercel deploy for the latest sidebar / My Girls commits.
3. Add one more story pack or Create one-tap polish if anything still sticky.
