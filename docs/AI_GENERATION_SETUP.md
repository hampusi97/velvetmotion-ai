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
- **Local ComfyUI:** `http://127.0.0.1:8188` plus a *real installed compatible image checkpoint/workflow*. When Studio detects the local server, it can try port 8188 without a duplicate settings entry and discovers installed `CheckpointLoaderSimple` checkpoints before dispatch; CORS permission may still be necessary in a regular browser.
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
  "speed": 1
}
```

The bridge can respond immediately with JSON such as `{"videoUrl":"https://example.com/render.mp4"}`, or with direct `video/*` bytes. For **long-running video generation**, it can instead reply `202 Accepted` with a same-origin status URL:

```json
{"state":"queued","statusUrl":"/jobs/my-job-123"}
```

Studio polls that URL every two seconds (up to 40 polls). When the job finishes, respond with `{"state":"completed","videoUrl":"https://example.com/render.mp4"}` (or `{"state":"failed","error":"..."}` when it fails). The polling endpoint must be on the same origin as the configured video URL and return a playable HTTP(S) video URL on completion; an inaccessible remote `blob:` URL will not work. This is a simple HTTP contract for a **separately installed** model/bridge, not a built-in ComfyUI video graph. Add authentication on your bridge if exposed publicly; do not put private server secrets in frontend code.

Without that endpoint, VelvetMotion can export a **pan/zoom WebM animated still**. This is a useful fallback but not generative video or genuine movement. The UI now labels it accordingly.

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
