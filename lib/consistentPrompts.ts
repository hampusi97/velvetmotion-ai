/**
 * Consistent scene prompts — identity locked via face seed + figure string;
 * scene layer swaps only (inspired by consistent-ai-character-prompts).
 */

export type ScenePrompt = {
  id: string;
  label: string;
  moodHint: string;
  scene: string;
};

export const SCENE_LIBRARY: ScenePrompt[] = [
  {
    id: "mirror-selfie",
    label: "Mirror selfie",
    moodHint: "beauty",
    scene: "bathroom mirror selfie, phone in hand, soft vanity lights, candid influencer pose",
  },
  {
    id: "golden-hour",
    label: "Golden hour",
    moodHint: "seductive",
    scene: "golden hour outdoor portrait, warm sunlight, soft bokeh, wind in hair",
  },
  {
    id: "bedroom-lingerie",
    label: "Bedroom lingerie",
    moodHint: "lingerie",
    scene: "sitting on edge of bed in lingerie, soft lamp light, intimate bedroom",
  },
  {
    id: "gym-selfie",
    label: "Gym selfie",
    moodHint: "beauty",
    scene: "gym mirror selfie, athletic wear, fit lighting, confident smile",
  },
  {
    id: "night-club",
    label: "Night out",
    moodHint: "seductive",
    scene: "nightclub neon lights, tight dress, party atmosphere, close portrait",
  },
  {
    id: "shower",
    label: "Shower steam",
    moodHint: "nude",
    scene: "steamy shower, water droplets on skin, soft fog, intimate candid",
  },
  {
    id: "office",
    label: "Office tease",
    moodHint: "lingerie",
    scene: "after hours office, blouse slightly open, desk lighting, secretive smile",
  },
  {
    id: "pool",
    label: "Poolside",
    moodHint: "beauty",
    scene: "poolside lounge, wet hair, swimsuit, bright sunlight, vacation vibe",
  },
  {
    id: "joi-bed",
    label: "JOI on bed",
    moodHint: "joi",
    scene: "kneeling on bed pointing at camera, instructional JOI pose, eye contact",
  },
  {
    id: "tribute",
    label: "Tribute invite",
    moodHint: "explicit",
    scene: "close-up face and chest, inviting expression, tribute me energy, soft flash",
  },
];

export function sceneExtra(id: string): string {
  return SCENE_LIBRARY.find((s) => s.id === id)?.scene || "";
}
