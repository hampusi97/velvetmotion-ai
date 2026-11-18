# VelvetMotion AI — Living Plan (Free Forever)

> Track what shipped vs what’s next. Update checkboxes when you merge.
> Last updated: 2026-11-18 · Policy: **no payments / no Stripe** — keep free.

Live site: https://velvetmotionai.vercel.app/ (or your Vercel project URL)  
Repo: https://github.com/hampusi97/velvetmotion-ai

---

## Status legend
- [x] Done on `main` (or local + pushed)
- [~] Partial / needs deploy or wire-up
- [ ] Not started

---

## A. Product core (Candy parity, NSFW, free)

| Item | Status | Notes |
|------|--------|-------|
| Unique girl portraits (Flux + faceSeed) | [x] | `lib/media.ts` |
| CharacterChat vault + NSFW chips (Lingerie/Nude/Explicit/Sex/JOI/SPH/BNWO) | [x] | `components/CharacterChat.tsx` |
| Free-text “send me a selfie/nude/JOI…” media | [x] | `lib/sceneRequest.ts` + chat send path |
| CreateGirlWizard optional photo + AI portrait | [x] | No photo required |
| Blindfold JOI | [x] | |
| Tribute nudges + gallery | [x] | Mid-chat + save tribute |
| Multi-tier memory (short/mid/long) | [x] | `memoryMap` + `memoryTiers` |
| Relationship stages | [x] | |
| Dual / group chat | [~] | Dual works; group UI exists |
| User lounge (Omegle-style) | [~] | UI + rules; **deploy firestore.rules** |
| Shorts feed (all episodes free) | [x] | `lib/shortsCatalog.ts` |
| Candy sidebar + mobile bottom nav | [x] | My Girls + Legal added |
| Proactive “she texts you” | [x] | PWA / idle watcher |
| Advanced ComfyUI / local media URL | [x] | Advanced settings |
| img2vid adapter | [x] | Best-effort / sequence fallback |
| Ollama optional `/api/chat` | [x] | When configured |

---

## B. Go-live free pack (this sprint)

| Item | Status | Notes |
|------|--------|-------|
| My Girls hub (recent + customs) | [x] | `components/MyGirlsHub.tsx` · view `mygirls` |
| Legal / Privacy / 18+ Safety pages | [x] | `components/LegalPages.tsx` · view `legal` |
| Lower GEN_COST + higher default coins + daily | [x] | `lib/storage.ts` (1200 coins, 200 daily) |
| `resolveBestMediaUrl` | [x] | `lib/media.ts` |
| PLAN.md (this file) | [x] | Living checklist |
| Deploy `firestore.rules` (loungeRooms) | [~] | See § Deploy below |

---

## C. Still heavier / next

| Item | Status | Notes |
|------|--------|-------|
| True WebRTC live video | [ ] | Voice-only in browser today |
| Telegram / Discord bridge worker | [ ] | Config only |
| WebLLM in-browser | [ ] | Optional zero-server path |
| Live2D / VRM avatars | [ ] | |
| IP-Adapter true face lock | [ ] | Seed lock is best-effort on Pollinations |
| Firebase lounge fully live | [~] | Needs rules deploy + auth |
| Expand 3D suite hotspots | [ ] | |
| More BNWO/SPH/cuck story packs | [ ] | Packs exist; keep adding |
| Mobile sidebar parity | [~] | Bottom nav shipped; sidebar desktop |

---

## Deploy firestore.rules (required for lounge writes)

Rules file in repo: `firestore.rules` (includes `loungeRooms/{roomId}` + messages).

### Option A — Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/) → your VelvetMotion project.
2. **Firestore Database** → **Rules**.
3. Paste contents of `firestore.rules` from this repo (or use CLI).
4. **Publish**.

### Option B — Firebase CLI
```bash
# from repo root, with firebase-tools installed and logged in
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

### Verify
- Signed-in user can create/read `loungeRooms/{id}` and post messages.
- Unsigned users still blocked (default deny).

---

## Dev / build notes

```bash
cd <repo>
rm -rf node_modules
npm install
npm run build
```

Sandbox often OOM’s on full `next build`; CI/Vercel is source of truth when green.

---

## Free forever guardrails

- Do **not** add Stripe, paywalls, or paid-only Shorts.
- Coins are local retention flavor, not real money.
- All companions fictional 21+; age gate required.
- Keep NSFW chips and free-text media working.

---

## Suggested next 3 pushes

1. Confirm Vercel green after My Girls + Legal + storage push.
2. Deploy firestore.rules → test Lounge with signed-in account.
3. One more Shorts series + Create finish one-tap polish if anything still sticky.
