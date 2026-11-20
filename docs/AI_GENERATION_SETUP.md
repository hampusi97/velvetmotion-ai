# VelvetMotion AI — Getting real chat, neural voice, images, and video

The web app is a static Next.js export. It does not ship an LLM, a TTS model, a diffusion checkpoint, a video generator, or a hosted backend. A healthy web build alone **does not** mean those generators are running. All third-party models and services must be used in accordance with their terms.

## Chat (real model, not canned text)
- **Local KoboldCpp:** OpenAI-compatible chat at `http://127.0.0.1:5001/v1/chat/completions`.
- **Local Ollama:** OpenAI-compatible chat at `http://127.0.0.1:11434/v1/chat/completions`. Install and load a model in Ollama; merely starting the server is insufficient.
- **Home Engine:** `http://127.0.0.1:8787/api/chat`, when installed and serving a real model.
- **BYOK:** Set a compatible custom endpoint or OpenRouter key in AI Settings.
- **Free route:** AI Horde can be slow, full, or lack compatible workers. Availability is not guaranteed.
- The chosen provider now controls routing: choosing local will not quietly send chats to a cloud worker. When all compatible providers fail, the app reports a connection error instead of pretending it generated a reply.

## Neural voice
- **Kokoro-FastAPI:** an OpenAI-compatible TTS endpoint at `http://127.0.0.1:8880/v1/audio/speech`, with a female voice such as `af_heart` or `af_bella`; requires a separately running TTS server.
- **Optional Fish local service:** OpenAI-compatible speech endpoint at `http://127.0.0.1:5002/v1/audio/speech`, only if one is installed there.
- The UI falls back to browser speech when neural services are unreachable. The label **Browser voice (fallback)** is literal; it is not Kokoro-quality audio. The server now has a more realistic synthesis timeout, and hands-free calls wait for playback to complete before restarting the microphone.
- Browser autoplay, browser CORS, and HTTPS-to-localhost restrictions may prevent local TTS despite a running server.

## Images
- **Local ComfyUI:** `http://127.0.0.1:8188` plus a *real installed compatible image checkpoint/workflow*.
- **General-purpose cloud worker:** used for ordinary images, not mature-mode requests.
- **AI Horde:** optional image generation with `nsfw: true` only for appropriate adult requests; only workers accepting that type of request can run it. Free queues, active models, and moderation decisions vary. No model names are hard-coded unless a user explicitly selects them.
- **Face identity:** the same per-character seed is used when aggressive face lock is enabled. A seed alone does not provide face identity fidelity; a compatible reference-image workflow/IP-Adapter is better.

## Genuine video generation (not canvas motion)
A connected **video model** is required. A running ComfyUI service by itself does not imply a ready video workflow, and the standard ComfyUI API expects a submitted workflow graph at `/prompt`, not a generic `/generate-video` route.

In **Advanced media**, configure `img2vidUrl` with a bridge that accepts an HTTP POST like:

```json
{
  "imageUrl": "https://example.com/input.jpg",
  "image": "https://example.com/input.jpg",
  "prompt": "subtle camera movement and natural expression",
  "motion": "slow-zoom-blink",
  "durationSec": 5,
  "speed": 1,
  "resolution": 720
}
```

The bridge can finish synchronously or queue the render. To queue it, send HTTP `202` with a same-origin job URL in `Location` or a JSON `statusUrl` field and, optionally, `Retry-After` in seconds. Studio keeps polling while the job returns `202`, for up to five minutes. Cross-origin bridges need CORS and must expose `Location` and `Retry-After` if they use those headers.

When ready, the bridge returns JSON such as `{"videoUrl":"https://example.com/render.mp4"}`, or with a direct `video/*` response. Add authentication on your bridge if exposed publicly; do not put private server secrets in frontend code.

The **AI video** option requests 480p, 720p, or 1080p. The provider chooses what it can render and Studio shows the actual dimensions once the clip loads. Use **Animated still** to export a browser-rendered pan-and-zoom clip without a video model. Stopping a queued render in Studio stops polling. The backend decides whether to cancel its own job.

### Use an installed ComfyUI video workflow locally

1. In ComfyUI, test a working image-to-video graph such as a compatible Wan or LTX workflow with an MP4 or WebM save node. Install its checkpoints and custom nodes first.
2. Export the graph as **API format**. In the exported JSON, set the `LoadImage` node's `inputs.image` to `"{{image}}"`. You can also replace the positive prompt field with `"{{prompt}}"`. Optional `"{{durationSec}}"` and `"{{resolution}}"` slots are replaced with numbers. Use these only in nodes that accept seconds and the configured resolution value. Leave frame counts and dimension pairs at your model's supported settings.
3. Set the `VELVET_COMFY_VIDEO_WORKFLOW` environment variable to that trusted local JSON file and start `python3 workers/local_media_proxy.py`. With the default loopback binding, set the Studio endpoint to `http://127.0.0.1:8787/generate-video`. For a local browser, run the app on localhost. The adapter accepts inline PNG, JPEG and WebP and sends them to your ComfyUI server.
4. Start with a short 480p test and inspect the real result before increasing resolution. Set `VELVET_VIDEO_ORIGINS` only if your app runs on a different trusted origin. For a publicly hosted bridge, enforce authentication and content rules on the server.

## High-detail portraits and guided audio

- **High detail** requests 1.5× the standard photo dimensions, up to 1536 pixels on the longest edge. It requires a configured local image model. A render error keeps the request local.
- Open **Guided JOI Audio** to generate three new cues using the configured chat model. Choose a fictional companion, duration and tone, review the draft, then open it in the existing timer and voice player. Ready-made sessions remain available.

## Troubleshooting
1. Open **Advanced media → Re-test All**. These probes check actual local chat/voice/image services rather than nonexistent `/api/*` routes.
2. An HTTP response means an endpoint is reachable; it does **not** prove that a model is loaded or supports the requested content. Test an actual generation.
3. Use the engine/result label and any error. Look for CORS/mixed-content failures, model not loaded, quota/rate limits, media formats, and invalid custom endpoint paths.
4. Avoid fake status claims, insecure API keys in URLs, nonconsensual real-person likenesses, or any sexual content involving minors. All companions must be fictional adults and all users should be age-verified before adult features are enabled.


## Private Atelier — reference-aware fictional artwork

**Advanced Media → Reference-aware image variations** now accepts an optional `img2imgUrl` for a compatible bridge. The Studio also supports local ComfyUI when configured with the necessary base64/reference-image and IP-Adapter nodes. A plain text-to-image model cannot guarantee identity consistency or preserve the reference.

After uploading an original fictional-adult portrait, confirming rights, and selecting **18+ fictional fantasy mode** if appropriate, Studio can submit this POST contract:

```json
{
  "image": "data:image/webp;base64,...",
  "imageUrl": "data:image/webp;base64,...",
  "prompt": "Original fictional adult character, keep visual identity, cinematic portrait...",
  "seed": 12345,
  "strength": 0.35,
  "adultMode": true,
  "sourceType": "fictional"
}
```

Accepted results: direct image bytes with an `image/*` content type or a JSON object with `imageUrl`, `url`, or `image` pointing to a valid image URL. If no reference-aware model is configured, the Studio displays an explicit failure instead of presenting a reused static portrait as generated content.

**Your own real-life selfie:** the upload UI recognizes this as a separate category and restricts it to nonsexual animation. It must not be submitted to the adult image variation route. The browser uses permissions checkboxes for convenience only; a commercial backend must enforce eligibility and source provenance independently.

For video, the bridge receives `sourceType` and `adultMode` fields. Treat these as untrusted inputs in your backend and independently verify the rules. This frontend alone is not identity or consent verification.

## Voice Atelier

During fictional companion creation, pick one of six female-style Kokoro voice presets and tune pitch/pace. **Instant preview** uses the device’s Web Speech engine; **Neural preview** uses a separately running compatible Kokoro TTS server at `127.0.0.1:8880`. The selected `voiceId` and browser tuning are written into the companion record so voice calls can reuse them.

This does **not** synthesize a unique voice from real-person recordings or guarantee a particular voice provider supports adult content. A future voice-cloning backend must require verifiable speaker authorization, explicit usage consent, revocation, and secure deletion.

## Visual motion vs video generation

The new **Living Portraits** homepage panel performs pausable, accessible Ken Burns effects on still portraits. It is a visual UI animation, not a video model. The actual Studio video workflow remains a separate configured generator and labels a browser pan/zoom clip honestly.
