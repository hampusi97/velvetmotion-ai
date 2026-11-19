#!/usr/bin/env bash
set -euo pipefail

# VelvetMotion AI — Android (Phone & Tablet) & Apple (iPhone & iPad) Build Helper
# Usage:
#   ./scripts/build-mobile.sh android   # Build Android APK/AAB from mobile/android
#   ./scripts/build-mobile.sh ios       # Open SwiftUI Universal iPhone/iPad project in Xcode
#   ./scripts/build-mobile.sh cap       # Sync Capacitor native wrappers (Android & iOS)

TARGET="${1:-help}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "$TARGET" in
  android)
    echo "==> Building VelvetMotion Android App (Phones & Tablets)..."
    cd "$ROOT_DIR/mobile/android"
    if [ -x "./gradlew" ]; then
      ./gradlew assembleDebug
    elif command -v gradle >/dev/null 2>&1; then
      gradle assembleDebug
    else
      echo "Open $ROOT_DIR/mobile/android in Android Studio to generate APK/AAB builds."
    fi
    ;;
  ios)
    echo "==> Opening VelvetMotion Apple iPhone & iPad App (SwiftUI)..."
    if command -v open >/dev/null 2>&1; then
      open "$ROOT_DIR/mobile/ios/Package.swift"
    else
      echo "Open $ROOT_DIR/mobile/ios in Xcode on macOS to archive for iPhone & iPad."
    fi
    ;;
  cap)
    echo "==> Syncing Capacitor native Android & iOS projects..."
    cd "$ROOT_DIR"
    npx -y @capacitor/cli sync
    ;;
  *)
    echo "VelvetMotion AI Mobile & Tablet App Builder"
    echo "  ./scripts/build-mobile.sh android  - Build Android Phone & Tablet APK"
    echo "  ./scripts/build-mobile.sh ios      - Open Apple iPhone & iPad SwiftUI app in Xcode"
    echo "  ./scripts/build-mobile.sh cap      - Sync Capacitor config (capacitor.config.ts)"
    ;;
esac
