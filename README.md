# VelvetMotion AI

Private AI companion studio. 100% free, static-export Next.js 15 on Cloudflare Workers.

**Live:** https://velvetmotion-ai.hampusi97.workers.dev

## Quick start (local host)

1. Download the one-click launcher from the Desktop page:
   - Windows: `/downloads/start-velvet-engine.bat`
   - Mac: `/downloads/start-velvet-engine.command`
2. Double-click. Opens `http://127.0.0.1:8787`.
3. Optional local AI (for real NSFW / offline):
   - [Ollama](https://ollama.com/download) — chat
   - [ComfyUI](https://github.com/Comfy-Org/ComfyUI) — images (`:8188`)
   - [SD web UI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) — images (`:7860`)
   - [LAIGFE](https://github.com/ciredark/LAIGFE) — full local installer

## Features

- Explore grid with unique portraits
- Chat with free cloud LLM + local Ollama/KoboldCpp fallback
- Selfie generation (free cloud + local ComfyUI / SD web UI for NSFW)
- Velvet Shorts (Ken Burns + optional video)
- Discover swipe game
- One-click local host using your RAM/GPU
- 18+ age gate, Terms, Privacy

## Smoke-test checklist

1. Age gate → Enter → Explore loads
2. Open a girl → Chat sends a message
3. Mirror selfie / NSFW selfie returns an image
4. Shorts plays (or Ken Burns fallback)
5. Discover swipe works
6. Desktop page shows one-click host links
7. Coins stay synced
8. Mobile bottom nav is usable at 375px

## Deploy

```bash
npx next build
npx wrangler deploy
```

Requires `CLOUDFLARE_API_TOKEN`. Static export (`output: 'export'`) lands in `out/`.
