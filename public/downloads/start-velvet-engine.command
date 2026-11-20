#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo " VelvetMotion AI — Local Host"
echo " ============================"
echo " Hosts the site on http://127.0.0.1:8787"
echo " Uses your RAM/GPU if Ollama, KoboldCpp or ComfyUI is running."
echo ""

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 not found. Install from https://www.python.org/downloads/"
  echo "Then run this file again."
  exit 1
fi

echo "Starting server..."
open "http://127.0.0.1:8787" 2>/dev/null || true
python3 velvetmotion_home_engine.py
