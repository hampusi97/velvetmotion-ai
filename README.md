# VelvetMotion AI

**All content is fantasy. Fictional characters only.**

## Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect to GitHub and select `hampusi97/velvetmotion-ai`
4. Branch: **main**
5. Build command: `npm run build`
6. Publish directory: `.next`
7. Click **Deploy**

Netlify will auto-detect Next.js. The site will be live in a minute.

## Run locally

```bash
git clone https://github.com/hampusi97/velvetmotion-ai.git
cd velvetmotion-ai
npm install
npm run dev
```

Open **http://localhost:3000**

## Device dashboard

- Claim 20 demo credits once per device calendar day. Check-ins on consecutive days grow a streak; missing a day resets it.
- Pin companions from their profiles and open them from the dashboard.
- Continue Last Session restores the most recently opened built-in companion chat and its mode.
- Each companion and mode saves up to 100 recent messages in this browser. Use **Clear this chat** to reset that conversation.
- Night mode removes the background glow and uses darker surfaces.

These features use browser storage, not a user account. Credits cannot be spent or redeemed. Clearing browser data removes progress and conversations. When storage is blocked or full, changes last for the current visit only. Web Locks serialize check-ins across tabs in supported browsers; this is a local demo, not a secure balance ledger.

Login, cross-device sync, paid balances, and payouts require a backend and are not connected.

Run `npm test`, `npm run lint`, and `npm run build` to validate the app. `npm run test:core` checks daily reward and storage logic separately.

## Windows local companion

Open `/companion` on the deployed website and download the Windows local app. Install [Ollama for Windows](https://ollama.com/download/windows) once, extract the ZIP, and double-click `START-WINDOWS.cmd`.

The launcher uses Node.js 22+ if installed, or prepares a portable Node.js 24.22.2 runtime in its own folder after checking the official SHA-256 checksum. It connects to local Ollama, starts the engine when needed, and downloads `qwen2.5:1.5b` (about 1 GB) only if no models are installed. Your browser opens `http://127.0.0.1:3210/companion`. Keep the launcher window open.

The new companion supports non-explicit conversation, name and personality preferences, memory notes, browser speech, saved history, and model selection. It calls the real local model and reports errors without substituting preset responses. The existing app sections use their existing behavior and do not send their presets to this endpoint. No DeepSeek, GitHub Models, or other provider API key is required.

The local server accepts only loopback requests from its own origin, limits request sizes, accepts installed model names, and supplies the companion system instructions itself. It does not expose the model on the home network. Local browser data is separate from hosted-site data.

`npm run build` builds the static local website, packages the launcher and assets, then builds the normal standalone Next.js website. Python 3 is required for the ZIP packaging step. The generated download is served at `/downloads/velvetmotion-local-windows.zip`; generated packages are ignored by Git. `npm test` includes protocol integration tests against a test Ollama server. Windows launcher execution and inference on the user's PC must be verified on that PC.
