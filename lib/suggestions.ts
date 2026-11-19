/**
 * VelvetMotion AI — Live Feature Suggestions & Product Roadmap
 * Allows community members and the owner to propose, prioritize, and upvote backend,
 * frontend, mobile/tablet app, and AI companion upgrades.
 */

export type SuggestionCategory =
  | "Mobile & Tablet"
  | "AI & Video"
  | "Frontend"
  | "Backend"
  | "Companions";

export type SuggestionStatus = "Live" | "In Progress" | "Planned";

export interface FeatureSuggestion {
  id: string;
  title: string;
  detail: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  votes: number;
  author: string;
  createdAt: number;
}

export const INITIAL_SUGGESTIONS: FeatureSuggestion[] = [
  {
    id: "sug-mobile-apps",
    title: "Android & Apple (iPhone + iPad) Standalone Mobile Apps",
    detail:
      "Native Kotlin Android project (mobile/android), SwiftUI Universal iPhone/iPad app (mobile/ios), Capacitor config, and network-first PWA installer.",
    category: "Mobile & Tablet",
    status: "Live",
    votes: 142,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: "sug-voice-cloning",
    title: "Per-Companion Custom Voice Cloning (ElevenLabs / FishAudio / Kokoro)",
    detail:
      "Upgrade browser WebSpeech TTS with ultra-realistic breathy companion voice clones streamed directly from `/api/live-voice`.",
    category: "AI & Video",
    status: "In Progress",
    votes: 98,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 10,
  },
  {
    id: "sug-firestore-leaderboard",
    title: "Persistent Firestore Global Leaderboard & Automated BTC Verification",
    detail:
      "Verify incoming Bitcoin tips to bc1qjmf9u3cmrn59q5nqmzgkvrgy7exegnfmph999k via Mempool.space API and auto-promote Top Donators in Firestore.",
    category: "Backend",
    status: "Planned",
    votes: 87,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: "sug-comfy-img2vid",
    title: "One-Click Wan2.1 / AnimateDiff Cloud GPU Video Worker",
    detail:
      "Connect `/api/generate-video` directly to RunPod/Modal Wan2.1 or ComfyUI SVD workflows for true 5-second uncensored MP4 clips.",
    category: "AI & Video",
    status: "Planned",
    votes: 79,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: "sug-biometric-vault",
    title: "FaceID / Fingerprint Biometric Private Vault Lock on Mobile & Tablet",
    detail:
      "Lock the Private Vault and hidden gallery behind device FaceID, TouchID, or Android Biometrics in addition to the 4-digit PIN.",
    category: "Mobile & Tablet",
    status: "Planned",
    votes: 64,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    id: "sug-ipad-split",
    title: "iPad & Tablet Split-Pane Chat + Live 3D Stage Mode",
    detail:
      "Side-by-side layout on tablets (768px–1180px) showing the companion's live 3D JOI / Penthouse portrait on the left and live chat on the right.",
    category: "Frontend",
    status: "In Progress",
    votes: 58,
    author: "VelvetCore",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
];
