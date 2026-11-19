/**
 * Feature hooks inspired by open-source companion stacks.
 * Free / static path stays primary; these are optional upgrades.
 */

export const COMPANION_FEATURES = {
  memory: "Rolling summary every 15–20 messages (SillyTavern-style)",
  voice: "Browser SpeechSynthesis + optional Kokoro-web / local TTS",
  images: "Static portraits + AI Horde / Cloudflare Flux",
  video: "Image sequence + optional local ComfyUI / Wan / FramePack",
  lipSync: "Optional TalkMateAI / HunyuanVideo-Avatar when local GPU present",
  characterCard: "SillyTavern V2 PNG/JSON import already supported",
};

export const VOICE_PACKS = [
  { id: "whisper", label: "Whisper", pitch: 0.9, rate: 0.85 },
  { id: "edge", label: "Edge", pitch: 1.05, rate: 0.95 },
  { id: "finish", label: "Finish", pitch: 1.1, rate: 1.05 },
  { id: "cuck", label: "Cuck report", pitch: 0.95, rate: 0.9 },
  { id: "bnwo", label: "BNWO rank", pitch: 0.88, rate: 0.86 },
];

import { cleanSpeechText, loadWebSpeechVoices, selectFemaleEnglishVoice } from "@/lib/kokoroTts";

export function speakWithPack(text: string, packId = "whisper") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = cleanSpeechText(text);
  if (!clean) return;
  const pack = VOICE_PACKS.find((p) => p.id === packId) || VOICE_PACKS[0];
  window.speechSynthesis.cancel();
  void loadWebSpeechVoices().then((voices) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.pitch = Math.max(1.04, pack.pitch);
    u.rate = pack.rate;
    const fem = selectFemaleEnglishVoice(voices);
    if (fem) u.voice = fem;
    window.speechSynthesis.speak(u);
  });
}
