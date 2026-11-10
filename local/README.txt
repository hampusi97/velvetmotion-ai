VELVETMOTION LOCAL COMPANION — WINDOWS

1. Install Ollama once: https://ollama.com/download/windows
2. Extract this entire ZIP to a folder. Do not run it from inside the ZIP.
3. Double-click START-WINDOWS.cmd. Keep its window open.
4. Your browser opens http://127.0.0.1:3210/companion

The launcher uses an existing Node.js 22+ installation or downloads a portable
Node.js 24.22.2 runtime from nodejs.org and verifies its SHA-256 checksum.
It changes no global Node.js configuration. Its runtime stays in .runtime/.

It connects to Ollama on 127.0.0.1:11434. If no engine is running, it starts one.
If you have no models, it downloads qwen2.5:1.5b (about 1 GB). If you already have
models, choose one in the companion screen. First setup requires internet.
Once the engine and model are installed, inference runs on your computer.

This companion supports conversation and non-explicit romance. It does not
generate explicit sexual content or images. Existing app sections are not
connected to the live model endpoint.

Chat and companion preferences are saved in this browser. Clear chat removes
the current conversation. The local website's data is separate from data saved
on the hosted website. Clearing browser data removes your saved conversations.

No API key is required. This website listens only on your computer's loopback
address. It is not published to your home network or the internet. Your PC must
remain on while you use it. Ctrl+C in the launcher stops the local website.

Troubleshooting:
- If port 3210 is occupied, close an older local-app window and start again.
- If inference is slow, choose a smaller model. The starter model is intended
  for modest hardware; performance depends on your RAM and processor/GPU.
- If a download fails, rerun the launcher after checking internet access.
