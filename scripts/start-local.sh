#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "  VelvetMotion AI — Local Companion Stack Launcher"
echo "=================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js (>= 20) is required." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[1/3] Installing npm dependencies..."
  npm install
else
  echo "[1/3] Dependencies already installed."
fi

PROXY_PID=""
cleanup() {
  if [ -n "$PROXY_PID" ] && kill -0 "$PROXY_PID" 2>/dev/null; then
    kill "$PROXY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if command -v python3 >/dev/null 2>&1; then
  echo "[2/3] Starting local ComfyUI/Forge/Ollama CORS proxy on http://127.0.0.1:8787 ..."
  python3 workers/local_media_proxy.py --host 127.0.0.1 --port 8787 >/dev/null 2>&1 &
  PROXY_PID="$!"
else
  echo "[2/3] Python 3 not found; skipping local media CORS proxy."
fi

DEV_PORT="${PORT:-3000}"
echo "[3/3] Starting VelvetMotion AI on http://0.0.0.0:${DEV_PORT} ..."
PORT="$DEV_PORT" exec node scripts/run-cloud-dev.mjs
