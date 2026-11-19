#!/usr/bin/env bash
# VelvetMotion AI — Google Cloud Shell / Codespaces / Project IDX / Linux Setup & Launcher
# Usage:
#   bash scripts/cloudshell-setup.sh                  # Install, verify, build out/ and serve on $PORT (default 8080)
#   bash scripts/cloudshell-setup.sh --dev            # Run Next.js dev server on 0.0.0.0:${PORT:-8080}
#   bash scripts/cloudshell-setup.sh --deploy-firebase # Deploy firestore.rules + auth via Cloud Shell (--no-localhost if needed)
#   bash scripts/cloudshell-setup.sh --deploy-cf      # Deploy static out/ to Cloudflare Workers via Wrangler
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="serve"
for arg in "$@"; do
  case "$arg" in
    --dev) MODE="dev" ;;
    --serve) MODE="serve" ;;
    --deploy-firebase) MODE="deploy-firebase" ;;
    --deploy-cf) MODE="deploy-cf" ;;
    --build-only) MODE="build-only" ;;
  esac
done

ENV_NAME="Shell"
if [ "${CLOUD_SHELL:-}" = "true" ]; then
  ENV_NAME="Google Cloud Shell"
elif [ "${CODESPACES:-}" = "true" ]; then
  ENV_NAME="GitHub Codespaces"
elif [ -n "${IDX_CHANNEL:-}${CLOUD_WORKSTATIONS_ENV:-}" ]; then
  ENV_NAME="Firebase Studio / Cloud Workstations"
fi

echo "============================================================"
echo "  VelvetMotion AI — ${ENV_NAME} Bootstrap (${MODE})"
echo "============================================================"

# Ensure Node.js >= 20 (Cloud Shell often ships nvm)
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/' || echo 0)"
  if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
    nvm install 20 >/dev/null 2>&1 || true
    nvm use 20 >/dev/null 2>&1 || true
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js >= 20 is required." >&2
  exit 1
fi
echo "[1/4] Node $(node -v) · npm $(npm -v)"

if [ ! -d "node_modules" ]; then
  echo "[2/4] Installing dependencies..."
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  echo "[2/4] node_modules present (skipping reinstall)."
fi

echo "[3/4] Running asset & Firestore rules checks..."
npm run audit:companions
npx tsx --test firestore.rules.test.ts

PREVIEW_PORT="${PORT:-8080}"

case "$MODE" in
  dev)
    echo "[4/4] Starting VelvetMotion AI dev server on http://0.0.0.0:${PREVIEW_PORT}"
    echo "      Open Web Preview on port ${PREVIEW_PORT} in ${ENV_NAME}."
    PORT="$PREVIEW_PORT" HOST="0.0.0.0" exec node scripts/run-cloud-dev.mjs
    ;;
  build-only)
    echo "[4/4] Building static export out/..."
    NODE_ENV=production npm run build
    echo "Done! Static output ready in ./out"
    ;;
  deploy-firebase)
    echo "[4/4] Validating & deploying Firebase Firestore rules + Auth config..."
    if ! npx -y firebase-tools@latest projects:list >/dev/null 2>&1; then
      echo "No active Firebase CLI session detected. Launching headless Cloud Shell login..."
      npx -y firebase-tools@latest login --no-localhost
    fi
    npx -y firebase-tools@latest deploy --only firestore:rules --project ivory-sunset-mxq1s
    ;;
  deploy-cf)
    echo "[4/4] Building out/ & deploying to Cloudflare Workers..."
    NODE_ENV=production npm run build
    npx -y wrangler deploy
    ;;
  serve|*)
    echo "[4/4] Building out/ & starting static Web Preview on http://0.0.0.0:${PREVIEW_PORT}"
    NODE_ENV=production npm run build
    echo "      Click 'Web Preview -> Preview on port ${PREVIEW_PORT}' in ${ENV_NAME}."
    PORT="$PREVIEW_PORT" HOST="0.0.0.0" exec node scripts/serve-static.mjs
    ;;
esac
