import { defaultProfile, VOICE_PROFILES, type VoiceMood, type VoiceProfile } from "@/data/voiceProfiles";

export function profileFor(companionId: string, fallbackVoiceId: string): VoiceProfile {
  return VOICE_PROFILES[companionId] ?? defaultProfile(fallbackVoiceId);
}

const RULES: [RegExp, VoiceMood][] = [
  [/\b(don'?t|stop|hold|wait|now)\b/i, "stern"],
  [/\b(quiet|close|listen|breathe|slow)\b/i, "whisper"],
  [/\b(he|him|his|bull)\b/i, "report"],
  [/\b(please|good|baby|sweet)\b/i, "warm"],
  [/\b(ready|come on|bet)\b/i, "tease"],
];

export function moodFor(text: string): VoiceMood {
  for (const [re, mood] of RULES) if (re.test(text)) return mood;
  return "warm";
}

export function delivery(text: string, profile: VoiceProfile) {
  const m = profile.moods[moodFor(text)];
  return { rate: m.rate, pitch: m.pitch, style: m.style };
}
