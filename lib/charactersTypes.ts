export interface KinkSettings {
  bondageLevel: number; // 0 to 100
  intensityFactor: number; // 1 to 10
  preferredActs: string[];
}

export interface CharacterVoice {
  label: string;
  pitch: number;
  rate: number;
  style: string;
}

export interface Character {
  id: string;
  name: string;
  age: number;
  tagline: string;
  category: string;
  avatar: string;
  voiceIntro: string;
  initialMessage: string;
  tags: string[];
  intimacy: number;
  voice: CharacterVoice;
  personality: string;
  traits: string[];
  background: string;
  figure: string;
  kink: string;
  reply: string;
  kinkSettings?: KinkSettings;
}

