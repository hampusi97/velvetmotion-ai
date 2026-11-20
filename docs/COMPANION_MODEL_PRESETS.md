# Optional companion language models

VelvetMotion does not bundle model weights. The model names below are suggestions, **not installed or tested local engines**. Text chat uses the existing Ollama/KoboldCpp/OpenAI-compatible provider routes. The Settings panel can check Ollama's `/api/tags` for models installed on your own machine. It does not download models automatically.

## Verified Ollama presets

Install [Ollama](https://ollama.com/download), then run exactly one of:

```sh
ollama pull hermes3:8b
ollama pull yi:9b-v1.5
ollama pull openchat:7b-v3.5-1210
ollama list
```

The official Ollama model pages list these exact tags:
- [Hermes 3 8B](https://ollama.com/library/hermes3:8b), about 4.7 GB quantized, Meta Llama 3 Community License.
- [Yi 1.5 9B](https://ollama.com/library/yi:9b-v1.5), about 5.0 GB quantized, Apache 2.0.
- [OpenChat 3.5 1210 7B](https://ollama.com/library/openchat:7b-v3.5-1210), about 4.1 GB quantized, Apache 2.0.

OpenChat 3.5 1210 has **7B parameters**, not a larger-than-9B parameter count. All weights are optional. The download sizes above are **specific Ollama quantizations**; actual memory usage includes context, runtime and GPU overhead. The catalog's suggested RAM sizes are not benchmarks or hardware guarantees.

In VelvetMotion, open **Settings → Companion language models**. Use **Check installed** after starting Ollama. Choose **Use locally** on an installed model; this updates `provider=local`, `preferredLocalRuntime=ollama`, and the selected model tag, so a running KoboldCpp server does not intercept your selected Ollama model. Nothing is downloaded when you select it.

Run a real chat test. The `/api/tags` check only confirms model availability, not model quality or successful generation.

## Additional manual models

- [InternLM2.5 7B Chat](https://huggingface.co/internlm/internlm2_5-7b-chat): separate model-weight licensing, review the terms for commercial use. Its model card describes an OpenAI-compatible vLLM route; no official Ollama tag is assumed here.
- [Humanish Roleplay Llama 3.1 8B](https://huggingface.co/vicgalle/Humanish-Roleplay-Llama-3.1-8B): model card lists Apache 2.0; review upstream Llama-family terms too. No official Ollama tag is assumed.

For either, independently install a licensed, supported model server and configure VelvetMotion's **custom OpenAI-compatible endpoint** and exact model ID. In Settings, enter a working model server URL such as `http://127.0.0.1:8000/v1` and choose **Use custom server** on the model card. This only selects the model and route; it does not launch a server or download any weights. Do not paste an API key into a public model link. Custom server compatibility, tokenizer/chat templates and hardware requirements need local verification.

## Privacy and licenses

When `provider=local`, VelvetMotion selects locally configured backends. Review any configured Home Engine or external URL before using private chats. Other provider choices can send messages off-device. Never commit model downloads or private API keys to GitHub. Model licenses and upstream restrictions apply independently of this repository.
