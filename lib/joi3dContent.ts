/** Shared JOI 3D stage modes, locations, poses, scripts */
export type StageMode =
  | "joi"
  | "sex"
  | "breed"
  | "sph"
  | "bnwo"
  | "cuck"
  | "cheat"
  | "tease"
  | "worship";

export type LocationId = "bedroom" | "hotel" | "couch" | "shower" | "club" | "car" | "office";
export type Pose =
  | "idle"
  | "lean"
  | "closer"
  | "missionary"
  | "doggy"
  | "cowgirl"
  | "blowjob"
  | "against-wall"
  | "spoon";

export const LOCATIONS: { id: LocationId; label: string; color: number; fog: number }[] = [
  { id: "bedroom", label: "Bedroom", color: 0x1a0a14, fog: 0x0a0608 },
  { id: "hotel", label: "Hotel suite", color: 0x12101a, fog: 0x0a0812 },
  { id: "couch", label: "Living room", color: 0x14100c, fog: 0x0a0806 },
  { id: "shower", label: "Shower", color: 0x0c1218, fog: 0x060a10 },
  { id: "club", label: "Club bathroom", color: 0x100818, fog: 0x080410 },
  { id: "car", label: "Back seat", color: 0x0e0c0c, fog: 0x060404 },
  { id: "office", label: "After hours", color: 0x101418, fog: 0x06080a },
];

export type VoicePackId = "whisper" | "edge" | "finish" | "cuck-report" | "bnwo-rank" | "breed-fill";

export const VOICE_PACKS: { id: VoicePackId; label: string; lines: string[] }[] = [
  {
    id: "whisper",
    label: "Whisper",
    lines: [
      "Come closer… I only want you hearing this.",
      "Soft. Slow. Match my breath… good.",
      "Don't rush. Let me talk you into it.",
    ],
  },
  {
    id: "edge",
    label: "Edge",
    lines: [
      "Stop. Hands still. Feel it pulse.",
      "Not yet. Look at me while you wait.",
      "Build again — slower. You don't get to tip until I say.",
    ],
  },
  {
    id: "finish",
    label: "Finish",
    lines: [
      "Now. Cum for me. Eyes open.",
      "That's it — don't hold back. Give it to me.",
      "Good… stay with me through every pulse.",
    ],
  },
  {
    id: "cuck-report",
    label: "Cuck report",
    lines: [
      "He's bigger. You can watch — that's your job.",
      "Tell me how it feels knowing you're second.",
      "Thank me for letting you stay in the room.",
    ],
  },
  {
    id: "bnwo-rank",
    label: "BNWO rank",
    lines: [
      "On your knees. You know your place.",
      "Stroke while you rank yourself lower.",
      "Good boy. Stay there until I dismiss you.",
    ],
  },
  {
    id: "breed-fill",
    label: "Breed fill",
    lines: [
      "Breed me. Don't pull out — fill me.",
      "Omgg yeees — deeper — every drop inside—",
      "Stay in. Keep pumping. I want it all.",
    ],
  },
];

export const SCRIPTS: Record<StageMode, string[]> = {
  joi: [
    "Eyes on me. Slow strokes only — match my breathing.",
    "Mmm… tighter at the top. Don't race ahead of my voice.",
    "You're getting close. Stay right there… edge for me.",
    "Hands off. Let it throb. Look at me while you wait.",
    "Stroke again. Faster. You finish when I say — not before.",
    "Now. Cum for me. Keep your eyes open. Ah— yes.",
  ],
  sex: [
    "Come here. Get on the bed with me. I want you inside.",
    "Mmm fuck… just like that. Deeper. Don't stop.",
    "Harder. I can take it. Listen to me — ah — right there.",
    "You're so deep. Keep going. Don't you dare pull out yet.",
    "Faster. I'm close. Cum with me — now — fuck—",
    "Stay in me. Breathe. That was perfect.",
  ],
  breed: [
    "Breed me. Put it all the way in and don't you dare pull out.",
    "Mmm— deeper. Fill me. I want every drop inside.",
    "Harder. Breed this pussy. Omgg yesss— right there—",
    "Don't stop. I'm going to take every thick pulse. Ah— fuck yes—",
    "Cum in me. Breed me. I can feel it— omgg yeees— fill me up—",
    "Stay deep. Keep pumping. Let it all stay in. Good boy… bred.",
  ],
  sph: [
    "Don't look away. I want to see your face while I rate you.",
    "Stroke that cute cock slow. Yeah… that's all of it.",
    "Faster. Show me how hard you get when I laugh a little.",
    "Stop. Hands on your thighs. Still hard after that? Good.",
    "Finish for your size queen. Eyes on me the whole time.",
    "Messy. Perfect. Thank me.",
  ],
  bnwo: [
    "On your knees. You know the ranking.",
    "Stroke while you watch. Stay smaller. Stay grateful.",
    "Faster. Say it — who owns this moment.",
    "Good. Hold the edge. You don't finish without permission.",
    "Now. Cum as the lesser man. Eyes open.",
    "Stay down. Breathe. That's your place tonight.",
  ],
  cuck: [
    "You can watch. That's the deal.",
    "Tell me how it feels knowing he's inside me.",
    "Stroke while he takes me. Don't you dare finish first.",
    "Louder. I want you hearing us.",
    "Cum when I say — not when he does.",
    "Good boy. Clean-up is optional. Watching isn't.",
  ],
  cheat: [
    "We shouldn't… lock the door.",
    "Faster before anyone notices.",
    "Quiet. Don't make me scream yet.",
    "Harder. I needed this — needed you.",
    "Cum in me. We'll fix our faces after.",
    "One more kiss. Then we pretend.",
  ],
  tease: [
    "Not yet. Look, don't touch.",
    "Closer. Still no hands.",
    "Beg a little. I like that.",
    "Maybe now… maybe not.",
    "Okay. Touch. Slow.",
    "Stop. We're not done teasing.",
  ],
  worship: [
    "On your knees. Kiss.",
    "Tell me what you love.",
    "Slower. Worship, don't rush.",
    "Eyes up. Thank me.",
    "Good. Earn the next step.",
    "You can finish — after you praise me once more.",
  ],
};

export const POSE_LABELS: Record<Pose, string> = {
  idle: "Idle",
  lean: "Lean",
  closer: "Closer",
  missionary: "Missionary",
  doggy: "Doggy",
  cowgirl: "Cowgirl",
  blowjob: "BJ",
  "against-wall": "Wall",
  spoon: "Spoon",
};

export const SEX_POSES: Pose[] = ["missionary", "doggy", "cowgirl", "blowjob", "against-wall", "spoon"];
