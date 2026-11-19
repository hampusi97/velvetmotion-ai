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
    "Finish for your size queen. Make a mess while I watch. Mmm.",
  ],
  bnwo: [
    "You're not the main event tonight. Stroke on my pace.",
    "Watch. Stay hard. Hierarchy is not optional.",
    "Edge. Hold. Thank me out loud if you want the finish.",
    "Permission granted. Cum for the ranking. Stay soft after.",
  ],
  cuck: [
    "Phone up. You're going to listen while I tell you everything.",
    "He's thicker. I'm not being cruel — just honest. Keep stroking.",
    "Mmm— hear that? That's me enjoying it. Don't stop your hand.",
    "You're going to thank me for the report. Edge. Hold.",
    "Finish now. Messy. While you picture the rest.",
  ],
  cheat: [
    "Lock the door. If anyone asks, we were just talking.",
    "Clothes off. We don't have long. Fuck me like you mean it.",
    "Quiet. Hands over my mouth if I get too loud — ah—",
    "Harder. I shouldn't want this. Don't stop.",
    "Cum in me. Quick. Then we put the mask back on.",
  ],
  tease: [
    "I put this body in the room just for you. Slow down.",
    "Imagine my hand instead of yours. Match the sway.",
    "Almost… not yet. Beg once, then I'll let you go.",
    "Finish. Look at the stage while you do. Good boy.",
  ],
  worship: [
    "On your knees for me — even if it's just in your head.",
    "Look at every curve. Tell me what you'd kiss first.",
    "Stroke only when I move. Match the breath.",
    "You're allowed to ache. You're not allowed to finish yet.",
    "Good. Now take it. All of it. For me. Mmm.",
  ],
};

export const POSE_LABELS: Record<Pose, string> = {
  idle: "Idle",
  lean: "Lean in",
  closer: "Closer",
  missionary: "Missionary",
  doggy: "Doggy",
  cowgirl: "Cowgirl",
  blowjob: "On knees",
  "against-wall": "Against wall",
  spoon: "Spoon",
};

export const SEX_POSES: Pose[] = ["missionary", "doggy", "cowgirl", "blowjob", "against-wall", "spoon"];
