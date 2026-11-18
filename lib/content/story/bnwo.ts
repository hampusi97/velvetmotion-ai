import type { StoryPack } from "../types";

/** BNWO / SPH / cuck-focused story packs — all fictional adults 21+. */
export const BNWO_SPH_PACKS: StoryPack[] = [
  {
    id: "sph-first-look",
    title: "First Look Under the Desk",
    tag: "SPH",
    desc: "She finally sees you. Soft voice, sharp words, and a slow decision about what happens next.",
    summary:
      "Ava Quinn, 26, has been teasing you for weeks. Tonight she locks the office door, kneels, and tells you exactly what she thinks — then decides whether you get to finish or beg.",
    accent: "rose",
    character: {
      name: "Ava Quinn",
      age: 26,
      role: "Office tease who finally looks",
      summary: "Sweet face, filthy honesty. She likes watching you squirm more than she likes being kind.",
    },
    chapters: [
      { id: "door", title: "Locked", sceneIds: ["locked", "look"] },
      { id: "decision", title: "The Verdict", sceneIds: ["verdict", "after"] },
    ],
    scenes: [
      {
        id: "locked",
        title: "After Hours",
        nextSceneId: "look",
        text: "The office is empty. Ava Quinn clicks the lock and turns, twenty-six, blouse still buttoned, eyes already lower than polite. You are thirty, standing because she told you to stand.\n\n\"I've been thinking about this,\" she says. \"Not in a mean way. In a curious way. Show me. No rush. Hands at your sides.\"\n\nShe steps closer, tilts her head, and waits. The hum of the building is the only sound.",
      },
      {
        id: "look",
        title: "The Look",
        nextSceneId: "verdict",
        text: "She sees you. For a long second she doesn't speak. Then a soft laugh escapes, not cruel, not kind — just honest.\n\n\"Oh. Okay. That's… smaller than I pictured when I was imagining you in the meeting.\" Her fingers hover, not touching yet. \"Don't look away. I want to see your face while I decide what to do with this.\"\n\nShe circles once. \"I can be gentle. Or I can narrate every inch. Tell me which one makes you harder.\"",
      },
      {
        id: "verdict",
        title: "What She Chooses",
        nextSceneId: "after",
        text: "Ava chooses narration. Soft voice, precise words, one fingertip tracing the air above you without contact until you are shaking.\n\n\"Stay still. Good. You're allowed to be embarrassed. I'm allowed to like it.\" She finally touches, light and deliberate, watching your reaction more than the act. \"When you finish it will be because I said so, not because you earned it. Clear?\"\n\nYou nod. She smiles like she just won a private bet.",
      },
      {
        id: "after",
        title: "After",
        text: "She cleans you up with a tissue and a kiss on the cheek that feels almost tender.\n\n\"Same time next week,\" she says. \"Or sooner if you text me something honest about how small you felt. I collect those.\" She unlocks the door. \"Go home. Think about me.\"",
      },
    ],
  },
  {
    id: "bnwo-indigo-night",
    title: "Indigo's Night",
    tag: "BNWO",
    desc: "She brings a friend. You watch. She makes sure you stay soft and grateful.",
    summary:
      "Indigo, 28, has been training your attention for months. Tonight she invites Marcus over and tells you exactly where to sit, what to say, and when you are allowed to look away.",
    accent: "violet",
    character: {
      name: "Indigo",
      age: 28,
      role: "Dominant partner who shares the view",
      summary: "Calm, deliberate, and completely in charge of the room and your eyes.",
    },
    chapters: [
      { id: "setup", title: "The Rule", sceneIds: ["rule", "arrival"] },
      { id: "watch", title: "Watch", sceneIds: ["watch", "aftercare"] },
    ],
    scenes: [
      {
        id: "rule",
        title: "Before He Arrives",
        nextSceneId: "arrival",
        text: "Indigo locks eyes with you. \"Marcus is ten minutes out. You sit on the chair by the window. You do not touch yourself. You do not leave. You thank me when I look at you. Clear?\"\n\nYou say yes. She kisses your forehead like a seal. \"Good boy. Tonight you get to see what I look like when I am not performing for you.\"",
      },
      {
        id: "arrival",
        title: "He Walks In",
        nextSceneId: "watch",
        text: "Marcus is taller, quieter, already comfortable in the space. Indigo greets him with a real kiss — deep, unhurried — while her hand stays on your shoulder so you cannot look away.\n\n\"This is the one I told you about,\" she says to him. \"He stays soft for me. He likes being reminded.\" She glances at you. \"Say hello properly.\"",
      },
      {
        id: "watch",
        title: "The View",
        nextSceneId: "aftercare",
        text: "They move to the bed. Indigo keeps the angle open so you can see everything. She talks to you between kisses and thrusts — soft instructions, occasional praise when you stay still, a single sharp look when your hands twitch.\n\n\"Eyes on us. This is what I need sometimes. You get to be part of it by watching and by staying exactly where I put you.\"\n\nWhen they finish she does not dismiss you. She holds the moment until your breathing matches hers.",
      },
      {
        id: "aftercare",
        title: "After He Leaves",
        text: "Marcus leaves with a nod. Indigo locks the door, sits on your lap fully clothed, and strokes your hair.\n\n\"You did well. No collapse. No sulking. That's why I keep you.\" She kisses you slowly. \"Tomorrow we can be soft and private again. Tonight you sleep knowing I used the room the way I wanted and you were still mine.\"",
      },
    ],
  },
  {
    id: "cuck-opaline",
    title: "Opaline's Guest",
    tag: "CUCK",
    desc: "She brings him home. You pour the drinks. She makes sure you stay in the room.",
    summary:
      "Opaline, 31, has been honest with you for a year. Tonight her guest arrives and she gives you one job: stay present, stay soft, and learn what she sounds like when she is not performing for you alone.",
    accent: "amber",
    character: {
      name: "Opaline",
      age: 31,
      role: "Partner who shares the night",
      summary: "Warm, clear, and never cruel for its own sake. She wants you in the room, not erased.",
    },
    chapters: [
      { id: "prepare", title: "Before", sceneIds: ["prepare", "door"] },
      { id: "night", title: "The Night", sceneIds: ["night", "morning"] },
    ],
    scenes: [
      {
        id: "prepare",
        title: "The Talk",
        nextSceneId: "door",
        text: "Opaline sits you down. \"He arrives at nine. You open the wine. You stay on the chair by the bed unless I call you closer. You do not compete. You do not leave. If it becomes too much you say the word we agreed and we stop everything. Clear?\"\n\nYou nod. She takes your hand. \"I love you. This is not a test you can fail by being small. This is me wanting both of you in the same night.\"",
      },
      {
        id: "door",
        title: "He Arrives",
        nextSceneId: "night",
        text: "You open the door. Opaline greets him with a kiss that is already different from the ones she gives you — hungrier, less careful. She introduces you by name and role without shame.\n\n\"He stays. He is part of this.\" She looks at you. \"Pour the wine. Then sit.\"",
      },
      {
        id: "night",
        title: "In the Room",
        nextSceneId: "morning",
        text: "They undress each other while you watch. Opaline keeps glancing at you — not to check if you are okay, but to include you in the heat. When she climbs on him she reaches for your hand and holds it through the first stretch of her body.\n\n\"Stay with me,\" she says. \"I want you to hear this.\" The sounds she makes are louder than the private nights. She does not hide them. When they finish she pulls you onto the bed beside them, still breathing hard, and kisses you with the same mouth.",
      },
      {
        id: "morning",
        title: "Morning",
        text: "He leaves before dawn. Opaline makes coffee and sits across from you in your shirt.\n\n\"Tell me the truth. Not the polite version.\" You do. She listens, then crawls into your lap. \"Good. We can do that again when the wanting lines up. Or we can have a month of only us. Both are allowed. You are still the one who stays.\"",
      },
    ],
  },
  {
    id: "sph-desk-sequel",
    title: "Desk Sequel — Measuring Tape",
    tag: "SPH",
    desc: "Ava brings a tape. She measures, narrates, and decides your finish condition.",
    summary:
      "Ava Quinn, 26, texts you back to the office after hours. This time she has a soft measuring tape and a list of rules you already agreed to by showing up.",
    accent: "rose",
    character: {
      name: "Ava Quinn",
      age: 26,
      role: "Office SPH sequel",
      summary: "Curious, precise, and addicted to your reactions more than the act.",
    },
    chapters: [
      { id: "return", title: "Back", sceneIds: ["return", "measure"] },
      { id: "finish", title: "Finish Rule", sceneIds: ["rule-finish", "leave"] },
    ],
    scenes: [
      {
        id: "return",
        title: "You Came Back",
        nextSceneId: "measure",
        text: "Ava is already at her desk when you close the door. She does not stand. She points at the spot in front of her.\n\n\"Good. You remembered the lock. Hands on the desk. I brought something.\" She unfolds a soft white measuring tape like it is stationery. \"Last time was visual. Tonight is data.\"",
      },
      {
        id: "measure",
        title: "Numbers",
        nextSceneId: "rule-finish",
        text: "She measures carefully, reading the number out loud once, then again softer, watching your face more than the tape.\n\n\"That is the number. We are not arguing with it. We are using it.\" She sets the tape aside and rests two fingers under your chin. \"You finish only after you say the number back to me without flinching. Practice.\"",
      },
      {
        id: "rule-finish",
        title: "The Condition",
        nextSceneId: "leave",
        text: "She works you with the same unhurried curiosity as before, stopping whenever your voice breaks on the number.\n\n\"Again. Clean.\" When you finally say it steady she smiles and lets you finish on the tissue she already prepared. \"See? Obedience looks good on you.\"",
      },
      {
        id: "leave",
        title: "Out",
        text: "She walks you to the elevator with a hand on your lower back.\n\n\"Text me the number once when you get home. Just the number. That is your goodnight.\" The doors close on her soft, satisfied expression.",
      },
    ],
  },
  {
    id: "bnwo-queen-weekend",
    title: "Queen Weekend",
    tag: "BNWO",
    desc: "A full weekend protocol. You serve, watch, and earn soft private time only after compliance.",
    summary:
      "Sable, 29, designs a weekend where your phone, your eyes, and your access are all on her schedule. Guests optional. Your posture is not.",
    accent: "violet",
    character: {
      name: "Sable",
      age: 29,
      role: "Weekend protocol queen",
      summary: "Elegant, structured, and warm only after the rules are met.",
    },
    chapters: [
      { id: "friday", title: "Friday Lock",
 sceneIds: ["lock-in", "guest"] },
      { id: "sunday", title: "Soft Hours", sceneIds: ["soft", "release"] },
    ],
    scenes: [
      {
        id: "lock-in",
        title: "Friday",
        nextSceneId: "guest",
        text: "Sable takes your phone, sets a charging station in the hallway, and hands you a written list: posture, address, when you may speak.\n\n\"This is not punishment. This is structure. You wanted to feel owned — here is the calendar version.\" She kisses your cheek. \"Kneel when I enter a room until I wave you up.\"",
      },
      {
        id: "guest",
        title: "Saturday Guest",
        nextSceneId: "soft",
        text: "A guest arrives mid-afternoon. Sable does not hide you. She positions you with a drink tray and a clear view.\n\n\"He knows the rules. So do you. You serve. You watch. You do not compete.\" The afternoon stretches. She checks your posture twice with a look that is almost affectionate.",
      },
      {
        id: "soft",
        title: "Sunday Soft",
        nextSceneId: "release",
        text: "Sunday morning the guest is gone. Sable pulls you into bed still in her robe and lets the protocol loosen.\n\n\"You held the weekend. That buys you this.\" Soft hands, soft voice, no audience. She still decides the pace.",
      },
      {
        id: "release",
        title: "Phone Back",
        text: "She returns your phone at the door with one condition.\n\n\"Screenshot the list and keep it. Next month we can run a shorter version or none at all. You get a vote — after you tell me what the structure did to you without performing.\"",
      },
    ],
  },
];
