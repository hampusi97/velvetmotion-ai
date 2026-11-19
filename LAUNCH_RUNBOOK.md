# VelvetMotion AI — Production Launch Runbook

Everything required to deploy, verify, and operate VelvetMotion AI across Web, Android (Phone & Tablet), Apple (iPhone & iPad), Firebase, and optional GPU/Telegram workers.

---

## 1. Firebase Backend (`ivory-sunset-mxq1s`) — Already Live
- **Web App ID**: `1:738750089666:web:8950a5b6c603c03ac32e5b` (`firebase-applet-config.json`)
- **Firestore Database**: `ai-studio-velvetmotionai-ff7c1796-da62-4f1a-b308-bc8bdc06e9aa`
- **Auth Providers Enabled**: Email/Password, Anonymous (Lounge & Community sync), Google Sign-In
- **Authorized Domains**: `localhost`, `velvetmotion-ai.vercel.app`, `velvetmotionai.vercel.app`
  - If you attach a custom domain (e.g., `velvetmotion.ai`), add the bare domain under **Firebase Console → Authentication → Settings → Authorized domains**.
- **CLI Deploy Anytime**:
  ```bash
  npx -y firebase-tools@latest login
  npm run deploy:firebase
  ```

---

## 2. Hosting & Instant Deployment Options

### Option A: Vercel (Default — `vercel.json`)
- Push to `main` triggers auto-deploy (if Hobby 100/day rate limit resets, trigger Redeploy in Vercel Dashboard).
- Set Environment Variables in **Vercel → Settings → Environment Variables**:
  - `GEMINI_API_KEY` *(recommended for live Gemini chat, voice, and Lyria music)*
  - `AI_IMAGE_ENDPOINT` / `AI_VIDEO_ENDPOINT` / `COMFY_URL` *(optional GPU workers)*
  - `TELEGRAM_BOT_TOKEN` *(optional Telegram worker)*

### Option B: Render (`render.yaml` — Zero-Wait Docker Deploy)
- Connect `hampusi97/velvetmotion-ai` in Render → **New Blueprint Instance** → auto-reads `render.yaml` and `Dockerfile`, checks `/api/health`.

### Option C: Fly.io (`fly.toml` — Zero-Wait Global Docker Deploy)
```bash
fly launch --copy-config
fly secrets set GEMINI_API_KEY="your-key"
fly deploy
```

### Option D: Self-Hosted Docker Compose (`docker-compose.yml`)
```bash
docker compose up -d --build
```
Starts the Next.js standalone web app (`:3000`), Python Local Media CORS Proxy (`:8787`), and optional Telegram Bridge worker.

---

## 3. Cloudflare Security & Edge Layer (Recommended for Custom Domain)
- Proxy your custom domain through Cloudflare (Orange Cloud) with:
  - **SSL/TLS**: Full (Strict)
  - **Always Use HTTPS**: ON
  - **Bot Fight Mode**: ON
- Application-level HTTP security headers (`HSTS`, `X-Content-Type-Options`, `COOP: same-origin-allow-popups`, `Permissions-Policy`), SSRF protection, XSS sanitization, 21+ safety guardrails, and per-IP sliding-window API rate limits are built into `next.config.ts` and `lib/safety.ts`.

---

## 4. Android & Apple Mobile/Tablet Apps
- **Instant Standalone PWA**: Users click **📱 App** in the top header (1-tap install on Android phones/tablets; Safari Share → Add to Home Screen on iPhone/iPad).
- **Native Android APK/AAB**: Open `mobile/android` in Android Studio or run `./scripts/build-mobile.sh android`.
- **Native Apple iPhone/iPad IPA**: Open `mobile/ios/Package.swift` in Xcode on macOS or run `./scripts/build-mobile.sh ios`.

---

## 5. Coin Wallet & Donations
- Official BTC Wallet: `bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k`
- Live on-chain verification via Mempool.space (`POST /api/wallet` `{ action: "verify-btc", txid }`) + persistent Firestore `donatorLeaderboard`.

---

## 6. Automated Monitoring
- `.github/workflows/uptime-health-monitor.yml` probes `/api/health` and security headers every 6 hours (and on manual trigger).
- In-app diagnostics: open **Advanced media → Re-test All** to verify all 6 backend endpoints live.
