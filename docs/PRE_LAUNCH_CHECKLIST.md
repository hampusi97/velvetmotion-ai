# Pre-Launch Secrets, Release Tag & Firebase Checklist

Before announcing publicly across the 9 free directories in [AI_DIRECTORY_TRACKER.md](./AI_DIRECTORY_TRACKER.md), verify these items in your accounts:

## 1. GitHub Repository Secrets (`hampusi97/velvetmotion-ai` → Settings → Secrets and variables → Actions)

| Secret | Required For | Notes |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Auto-deploying `out/` to `velvetmotion-ai.hampusi97.workers.dev` on every push to `main` via `.github/workflows/ci-web.yml` | Create API Token with **Edit Cloudflare Workers** permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers deploy target | Found on Cloudflare Dashboard → Workers & Pages overview |
| `FIREBASE_TOKEN` | Auto-deploying `firestore.rules` via `.github/workflows/deploy-firestore-rules.yml` | Generate locally with `npx firebase-tools login:ci` (or publish directly in Firebase Console) |
| `TAURI_SIGNING_PRIVATE_KEY` | Signed Tauri v2 auto-updater (`latest.json` + `.sig` files) | Generate with `npx tauri signer generate -w ~/.tauri/velvetmotion.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password used when generating `TAURI_SIGNING_PRIVATE_KEY` | Put matching public key string into `src-tauri/tauri.conf.json` -> `plugins.updater.pubkey` |

## 2. Optional Tip-Jar Environment Variables (GitHub Actions / Build Env)

- `NEXT_PUBLIC_KOFI_URL`: Your Ko-fi tip page (used by the 7-day dismissible `$3` Supporter Banner and Coin Wallet).
- `NEXT_PUBLIC_SUBSCRIBESTAR_URL`: Your SubscribeStar page for optional recurring adult-friendly tiers.

## 3. Firebase Console (`ivory-sunset-mxq1s`)

1. Open **Authentication → Settings → Authorized domains** and confirm these domains are added:
   - `velvetmotion-ai.hampusi97.workers.dev`
   - `tauri.localhost`
   - `ivory-sunset-mxq1s.firebaseapp.com`
2. Open **Firestore → Security Rules** for database `ai-studio-velvetmotionai-ff7c1796-da62-4f1a-b308-bc8bdc06e9aa` (and `(default)`) and ensure the contents match `firestore.rules` (or run `npm run deploy:rules` locally once logged into Firebase CLI).

## 4. Tag & Publish First Desktop Release (`v1.0.0`)

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers `.github/workflows/release-desktop.yml` across Windows, macOS (`aarch64` & `x86_64`), and Linux. `/download/` automatically resolves live assets from the published GitHub release.
