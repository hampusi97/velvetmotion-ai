# VelvetMotion AI — Android & Apple (iPhone & iPad) Mobile/Tablet Apps

VelvetMotion AI ships with **three ways** to run natively on Android phones/tablets and Apple iPhones/iPads:

## 1. Instant Zero-Store Install (PWA on Android, iPhone & iPad)
- **Android (Chrome / Edge / Samsung Internet)**: Open VelvetMotion AI and tap **"📱 Install App"** in the header/sidebar (or browser menu → *Install app*). Installs as a full-screen standalone app with offline shell and proactive notifications.
- **Apple iPhone & iPad (Safari)**: Open VelvetMotion AI → tap **Share** → **Add to Home Screen**. Runs edge-to-edge in standalone dark mode with full iPad rotation and safe-area insets.

## 2. Native Android App (Phones & Tablets — `mobile/android/`)
- Written in **Kotlin + AndroidX WebKit** (`ai.velvetmotion.app`).
- Explicitly supports small, normal, large, and xlarge screens (phones, foldables, and tablets), WebRTC camera/microphone permissions for Live Voice Calls, Android photo upload picker for Create Girl, and `bitcoin:` wallet URI handoff.
- Open `mobile/android` in **Android Studio** (or run `./scripts/build-mobile.sh android`) to build signed `.apk` / `.aab` packages.

## 3. Native Apple App (iPhone & iPad — `mobile/ios/`)
- Written in **Swift 5.9 + SwiftUI + WKWebView** (`ai.velvetmotion.app`).
- Configured as a Universal iPhone + iPad app (`UIDeviceFamily: [1, 2]`, `UIRequiresFullScreen: false` for iPad Split View & Stage Manager, inline media playback, and WebRTC camera/microphone permission delegation).
- Open `mobile/ios/Package.swift` in **Xcode** on macOS (or run `./scripts/build-mobile.sh ios`) to run on iPhone/iPad Simulator or archive for TestFlight / IPA sideloading.

## 4. Capacitor Bridge (`capacitor.config.ts`)
- Run `npm install -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios && npx cap sync` if you prefer managing plugins (Push Notifications, Biometric FaceID/Fingerprint Vault Lock, Haptics) via Capacitor.
