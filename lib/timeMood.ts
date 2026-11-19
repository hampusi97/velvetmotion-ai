/**
 * Real-Time Clock & Mood Sync
 * Dynamically adapts companion greetings, active mood badge, voice whisper bias,
 * and default Scene Selfie lighting/outfit suggestions based on the user's local hour.
 */

export type TimePeriod = "morning" | "daylight" | "nightlife";

export interface TimeMoodState {
  period: TimePeriod;
  hour: number;
  label: string;
  badge: string;
  whisperBias: boolean;
  sceneLightingBias: string;
  suggestedSceneId: string;
  greetingLine: (companionName: string) => string;
}

export function getTimeMood(now = new Date()): TimeMoodState {
  const hour = now.getHours();

  if (hour >= 6 && hour <= 11) {
    return {
      period: "morning",
      hour,
      label: "Morning Coffee",
      badge: "☕ Morning Glow",
      whisperBias: false,
      sceneLightingBias: "warm morning sunlight pouring through sheer curtains, coffee mug aesthetic",
      suggestedSceneId: "mirror-selfie",
      greetingLine: (name) =>
        `Morning… I just poured coffee and stole a warm spot by the window. ${name} already missed waking up beside you.`,
    };
  }

  if (hour >= 12 && hour <= 19) {
    return {
      period: "daylight",
      hour,
      label: hour >= 16 ? "Golden Hour" : "Daylight Spark",
      badge: hour >= 16 ? "🌅 Golden Hour" : "☀️ Daylight",
      whisperBias: false,
      sceneLightingBias: "golden-hour natural sunlight, rooftop breeze, candid DSLR warmth",
      suggestedSceneId: "sunset-pool",
      greetingLine: (name) =>
        `Afternoon heat looks good on us. ${name} is soaking up the golden light and waiting for your next dare.`,
    };
  }

  return {
    period: "nightlife",
    hour,
    label: "Neon Nightlife",
    badge: "🌙 Late-Night Whisper",
    whisperBias: true,
    sceneLightingBias: "moody magenta and cyber-cyan neon rim light, late-night intimate shadows",
    suggestedSceneId: "neon-balcony",
    greetingLine: (name) =>
      `*Whispering in the dark…* The city's quiet now. It's just ${name} and you tonight.`,
  };
}
