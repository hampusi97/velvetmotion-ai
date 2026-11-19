/**
 * Capacitor configuration for building native Android (Phone & Tablet)
 * and Apple iOS / iPadOS apps from VelvetMotion AI.
 *
 * Usage:
 *   npm install -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
 *   npx cap sync
 *   npx cap open android   # Android Studio (Phones & Tablets)
 *   npx cap open ios       # Xcode (iPhone & iPad)
 */
const serverUrl =
  process.env.CAP_SERVER_URL || "https://velvetmotion-ai.vercel.app";

const config = {
  appId: "ai.velvetmotion.app",
  appName: "VelvetMotion AI",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "velvetmotion-ai.vercel.app",
      "velvetmotionai.vercel.app",
      "*.firebaseapp.com",
      "accounts.google.com",
      "image.pollinations.ai",
    ],
  },
  android: {
    backgroundColor: "#07050c",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#07050c",
    contentInset: "automatic",
    allowsLinkPreview: false,
    preferredContentMode: "recommended",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#07050c",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#07050c",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;
