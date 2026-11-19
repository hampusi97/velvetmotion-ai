/**
 * User's own Discover / Tinder-style profile.
 * Stored in localStorage — drives match flavor and hooks.
 */

export type UserGender = "man" | "woman" | "nonbinary" | "unspecified";
export type LookingFor = "women" | "men" | "everyone";

export type DiscoverProfile = {
  displayName: string;
  gender: UserGender;
  lookingFor: LookingFor;
  age: number;
  bio: string;
  photoUrl?: string | null;
  tags: string[];
  updatedAt: number;
};

const KEY = "vm-discover-profile";

const DEFAULT: DiscoverProfile = {
  displayName: "",
  gender: "unspecified",
  lookingFor: "women",
  age: 28,
  bio: "",
  photoUrl: null,
  tags: [],
  updatedAt: 0,
};

export function loadDiscoverProfile(): DiscoverProfile {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<DiscoverProfile>;
    return {
      ...DEFAULT,
      ...parsed,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveDiscoverProfile(profile: DiscoverProfile): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...profile, updatedAt: Date.now() }),
    );
  } catch {
    /* quota */
  }
}

export function profileComplete(p: DiscoverProfile): boolean {
  return Boolean(p.displayName.trim()) && p.gender !== "unspecified";
}

export function personalizedHooks(profile: DiscoverProfile): string[] {
  const name = profile.displayName.trim() || "you";
  const base = [
    "She just liked you back",
    "Online now · wants nudes",
    "Wants something explicit",
    "Matched your vibe",
    "Looking for a late session",
    "Tribute energy tonight",
    "Feeling needy · send pic",
    "Will undress if you match",
    "In the mood to edge you",
    "Private content unlocked",
    "Wants sex video tonight",
    "Horny and online",
    "Ready to show everything",
    "Gallery full of nudes",
    "SPH mood · size queen online",
    "BNWO fantasy unlocked",
  ];
  if (profile.gender === "man" || profile.lookingFor === "women") {
    return [
      `${name.split(" ")[0]} — she peeked at your profile`,
      "She wants a man who can take instruction",
      "Online · wants your attention and your cock",
      "Matched · she already opened her camera",
      "Late-night only · bring stamina",
      ...base,
    ];
  }
  if (profile.gender === "woman") {
    return [
      "She likes girls who know what they want",
      "Soft top energy · she wants to spoil you",
      "Matched · dual session possible",
      ...base,
    ];
  }
  return base;
}

export const GENDER_OPTIONS: { id: UserGender; label: string }[] = [
  { id: "man", label: "Man" },
  { id: "woman", label: "Woman" },
  { id: "nonbinary", label: "Non-binary" },
  { id: "unspecified", label: "Prefer not to say" },
];

export const LOOKING_OPTIONS: { id: LookingFor; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "everyone", label: "Everyone" },
];

export const PROFILE_TAG_SUGGESTIONS = [
  "Dominant",
  "Submissive",
  "Switch",
  "JOI",
  "SPH",
  "BNWO",
  "Cuck",
  "Aftercare",
  "Voice",
  "Edging",
  "Praise",
  "Filthy talk",
];
