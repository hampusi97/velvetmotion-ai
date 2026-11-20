# VelvetMotion AI — Getting real chat, neural voice, images, and video

The web app is a static Next.js export. It does not ship an LLM, a TTS model, a diffusion checkpoint, a video generator, or a hosted backend. A healthy web build alone **does not** mean those generators are running. All third-party models and services must be used in accordance with their terms.

## Chat (real model, not canned text)
- **Local KoboldCpp:** OpenAI-compatible chat at `http://127.0.0.1:5001/v1/chat/completions`.
- **Local Ollama:** OpenAI-compatible chat at `http://127.0.0.1:11434/v1/chat/completions`. Install and load a model in Ollama; merely starting the server is insufficient.
- **Home Engine:** `http://127.0.0.1:8787/api/chat`, when installed and serving a real model.
- **BYOK:** Set a compatible custom endpoint or OpenRouter key in AI Settings.
- **Free route:** AI Horde can be slow, full, or lack compatible workers. Availability is not guaranteed.
- The chosen provider now controls routing: choosing local will not quietly send chats to a cloud worker. When all compatible providers fail, the app reports a connection error instead of pretending it generated a reply.

### Run Qwen3-4B on a CPU

Install a recent [llama.cpp](https://github.com/ggml-org/llama.cpp/releases) build and download `Qwen3-4B-Q4_K_M.gguf` from the [official Qwen repository](https://huggingface.co/Qwen/Qwen3-4B-GGUF). The download is about 2.5 GB. The following command uses the CPU and permits requests from the local VelvetMotion web app.

```bash
llama-server -m ./Qwen3-4B-Q4_K_M.gguf --alias qwen3-4b \
  --host 127.0.0.1 --port 18081 --n-gpu-layers 0 --ctx-size 8192 \
  --reasoning off --cors-origins http://localhost:3000
```

For the web app, run `npm run dev` at the repository root and open `http://localhost:3000`. For the Windows desktop app, launch VelvetMotion and use `--cors-origins http://tauri.localhost` when starting `llama-server`.

Open **Settings → Chat model** and select **Custom (OpenAI-compatible)**. Enter `http://127.0.0.1:18081/v1` as the endpoint URL and `qwen3-4b` as the model ID. Leave the API key blank and select **Save Preferences Locally**. Chat streams replies as the model writes. The same model can draft guided audio scripts. Generation speed depends on the machine, and supported content depends on the model and provider.

## Neural voice
- **Kokoro-FastAPI:** an OpenAI-compatible TTS endpoint at `http://127.0.0.1:8880/v1/audio/speech`, with a female voice such as `af_heart` or `af_bella`; requires a separately running TTS server.
- **Optional Fish local service:** OpenAI-compatible speech endpoint at `http://127.0.0.1:5002/v1/audio/speech`, only if one is installed there.
- The UI falls back to browser speech when neural services are unreachable. The label **Browser voice (fallback)** is literal; it is not Kokoro-quality audio. The server now has a more realistic synthesis timeout, and hands-free calls wait for playback to complete before restarting the microphone.
- Browser autoplay, browser CORS, and HTTPS-to-localhost restrictions may prevent local TTS despite a running server.

### Run Kokoro voice on a CPU

Download `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from the [Kokoro ONNX model release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) into the same folder. From the repository root, install the dependencies into a Python virtual environment and start the adapter.

```bash
python3 -m venv .venv-kokoro
.venv-kokoro/bin/python -m pip install kokoro-onnx==0.4.9 espeakng-loader==0.2.4
.venv-kokoro/bin/python workers/kokoro_local.py \
  --model /path/to/kokoro-v1.0.int8.onnx --voices /path/to/voices-v1.0.bin
```

The app discovers the service on `127.0.0.1:8880`. Open the Voice Atelier and try **Neural preview** or play a companion cue in Guided JOI Audio. This adapter returns 24 kHz WAV audio. Set `VELVET_VOICE_ORIGINS` to a comma-separated list of trusted app origins if using a different frontend origin.

## Images
- **Local ComfyUI:** `http://127.0.0.1:8188` plus a *real installed compatible image checkpoint/workflow*. When Studio detects the local server, it can try port 8188 without a duplicate settings entry and discovers installed `CheckpointLoaderSimple` checkpoints before dispatch; CORS permission may still be necessary in a regular browser.
- **General-purpose cloud worker:** used for ordinary images. Studio keeps the original resolution for download and animation, and saves a compact copy to Collection.
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

The bridge can finish synchronously or queue the render. To queue it, send HTTP `202` with a same-origin job URL in `Location` or a JSON `statusUrl` field and, optionally, `Retry-After` in seconds. Studio keeps polling for 30 minutes on the local ComfyUI bridge and five minutes on other endpoints. Cross-origin bridges need CORS and must expose `Location` and `Retry-After` if they use those headers.

When ready, the bridge returns JSON such as `{"videoUrl":"https://example.com/render.mp4"}`, or with a direct `video/*` response. Add authentication on your bridge if exposed publicly; do not put private server secrets in frontend code.

The **AI video** option requests 480p, 720p, or 1080p. The provider chooses what it can render and Studio shows the actual dimensions once the clip loads. Use **Animated still** to export a browser-rendered pan-and-zoom clip without a video model. Stopping a queued render in Studio stops polling. The backend decides whether to cancel its own job.

### Run Wan2.2 5B on your computer

The bundled image-to-video workflow produces portrait MP4s at 480×832 or 704×1280, at 24 fps when the speed is 1×. ComfyUI documents running this model with native offloading on 8 GB VRAM. Rendering time and usable duration depend on the card and available system RAM. The model authors list 24 GB VRAM for their own standalone 720p command. [ComfyUI Wan2.2 guide](https://docs.comfy.org/tutorials/video/wan/wan2_2) · [Wan2.2 model requirements](https://github.com/Wan-Video/Wan2.2#run-text-image-to-video-generation)

1. Start an up-to-date [local ComfyUI](https://docs.comfy.org/installation/comfyui_portable_windows). On Windows with a supported NVIDIA GPU, the Portable package includes `run_nvidia_gpu.bat`. The bridge uses `http://127.0.0.1:8188` by default. If ComfyUI prints a different port, set `COMFY_URL` to that address.
2. Download the three Wan2.2 5B files from the [official ComfyUI guide](https://docs.comfy.org/tutorials/video/wan/wan2_2#2-manually-download-models) and place them in the matching folders. Allow roughly 17 GB for the weights and additional space for outputs.

   | ComfyUI folder | File |
   | --- | --- |
   | `models/diffusion_models` | `wan2.2_ti2v_5B_fp16.safetensors` |
   | `models/text_encoders` | `umt5_xxl_fp8_e4m3fn_scaled.safetensors` |
   | `models/vae` | `wan2.2_vae.safetensors` |

3. From the VelvetMotion repo, start the local bridge in a separate terminal. Windows uses `py` in this example. On macOS or Linux, substitute `python3`.

   ```powershell
   py workers/local_media_proxy.py --wan-video
   ```

4. Run `npm install` once and then `npm run dev` from the repo. Open `http://localhost:3000`, select **Advanced Media → Use local ComfyUI**, and check the **Local ComfyUI video** result. It checks the workflow nodes and the model filenames. Keep ComfyUI and the bridge running while you use Studio.

   If the Home Engine is already running on port 8787, start the media bridge with `--wan-video --port 8788`. Save `http://127.0.0.1:8788/generate-video` in **Advanced Media → Video endpoint**.
5. In **Studio → Video**, select a companion and try **AI video**, **480p**, and **3 seconds**. Check the finished clip for motion and appearance before attempting a longer 720p render.

### Use your own ComfyUI video workflow

Export your working graph in **API format**. Set the `LoadImage` node's image input to `"{{image}}"` and the positive prompt input to `"{{prompt}}"`. Set `VELVET_COMFY_VIDEO_WORKFLOW` to that file and start `python3 workers/local_media_proxy.py`. The bridge accepts inline PNG, JPEG, or WebP and serves results at `http://127.0.0.1:8787/generate-video`.

Use optional `"{{durationSec}}"`, `"{{resolution}}"`, or `"{{seed}}"` slots only in nodes that accept those values. The bridge also supports `"{{width}}"`, `"{{height}}"`, `"{{frames}}"`, and `"{{fps}}"` for workflows compatible with the bundled portrait dimensions and 24 fps timing. Set `VELVET_VIDEO_ORIGINS` for a different trusted app origin.

## High-detail portraits and guided audio

- **High detail** requests 1.5× the standard photo dimensions, up to 1536 pixels on the longest edge. It requires a configured local image model. A render error keeps the request local.
- Open **Guided JOI Audio** to generate three cues using the configured chat model or load a built-in script. Select a fictional companion, theme, duration and tone, then review the draft. In chat, **Studio & Clips → Roleplay theme** passes the selected theme to the chat model and to the companion's JOI link.

## Troubleshooting
1. Open **Advanced media → Re-test All**. The diagnostics probe local chat, voice and image services and check the selected local video bridge.
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
