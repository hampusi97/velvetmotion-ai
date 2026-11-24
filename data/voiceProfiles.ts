export type VoiceMood = "warm" | "tease" | "stern" | "whisper" | "report";

export interface VoiceProfile {
  voiceId: string;
  moods: Record<VoiceMood, { rate: number; pitch: number; style: string }>;
  sample: string;
}

const base = (voiceId: string, sample: string): VoiceProfile => ({
  voiceId,
  sample,
  moods: {
    warm: { rate: 0.97, pitch: 1.0, style: "warm, unhurried" },
    tease: { rate: 1.02, pitch: 1.05, style: "playful, lifted" },
    stern: { rate: 0.93, pitch: 0.95, style: "flat, deliberate" },
    whisper: { rate: 0.88, pitch: 0.9, style: "breathy, close to the mic" },
    report: { rate: 1.0, pitch: 1.0, style: "matter-of-fact, present tense" },
  },
});

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  "camille-laurent": base("bf_emma", "Sit down. I'll tell you about Marcus, then you can tell me about your week."),
  "talia-brooks": base("af_heart", "I'm going out at eight. Don't wait up, but keep your phone on."),
  "nadia-farrow": base("bf_emma", "He's just pulled up. I'll text you from the car."),
  "elise-moreau": base("af_sarah", "Don't say anything to him. Not yet."),
  "ines-vidal": base("af_bella", "You're going to hear me say his name a lot tonight."),
  "fern-ashby": base("af_nicole", "Headphones on. Hands where I can't see them."),
  "yuki-sato": base("af_nicole", "You came back. Good. Sit."),
  "valeria-cruz": base("af_bella", "You should hear what they said about you downstairs."),
  "daisy-miller": base("af_sky", "Ten seconds. Get comfortable."),
  "claire-bennett": base("af_sarah", "Shh. The shop's closed, so you don't have to whisper anymore."),
};

export const defaultProfile = (voiceId: string): VoiceProfile =>
  base(voiceId, "Hey. Come here for a minute.");
