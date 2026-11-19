#!/usr/bin/env bash
# Deploy & Cloud Shell Quick Reference for VelvetMotion AI
set -euo pipefail

echo "=== VelvetMotion AI Deploy Commands ==="
echo "1) Cloud Shell / Codespaces / IDX Preview (port 8080):  bash scripts/cloudshell-setup.sh"
echo "2) Cloud Shell Dev Server (port 8080 or \$PORT):         PORT=8080 npm run dev:cloud"
echo "3) Cloudflare Workers Static Assets:                      NODE_ENV=production npm run build && npx wrangler deploy"
echo "4) Firebase Firestore Rules (Cloud Shell / SSH):          npm run deploy:rules:cloudshell"
echo "5) Live Web URL:                                          https://velvetmotion-ai.hampusi97.workers.dev"
echo "6) GitHub Repository:                                     https://github.com/hampusi97/velvetmotion-ai"
