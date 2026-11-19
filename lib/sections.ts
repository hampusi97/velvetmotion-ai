export type SectionId =
  | "girls"
  | "penthouse"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "room"
  | "roulette"
  | "blindfold"
  | "joi3d"
  | "scenario"
  | "suggest"
  | "gallery"
  | "packs"
  | "tribute"
  | "workspace";

export type ViewId = "home" | SectionId;

export type Section = {
  id: SectionId;
  title: string;
  kicker: string;
  summary: string;
  art: string;
};

export const sections: Section[] = [
  {
    id: "penthouse",
    title: "3D Penthouse",
    kicker: "3D Suite",
    summary: "Interactive Three.js boudoir suite with lighting moods & hotspots.",
    art: "bg-[radial-gradient(120%_90%_at_18%_0%,#e879f9_0%,transparent_48%),linear-gradient(165deg,#3b0764_0%,#0f0518_75%)]",
  },
  {
    id: "scenario",
    title: "Spicy Scenarios",
    kicker: "Engine",
    summary: "Launch advanced custom NSFW fantasy roleplay scenarios instantly.",
    art: "bg-[radial-gradient(120%_90%_at_18%_0%,#f43f5e_0%,transparent_48%),linear-gradient(165deg,#4c0519_0%,#0f050b_75%)]",
  },
  {
    id: "girls",
    title: "Girls",
    kicker: "Cast",
    summary: "Browse companions and start chatting.",
    art: "bg-[radial-gradient(120%_90%_at_18%_0%,#ff4d9a_0%,transparent_46%),linear-gradient(165deg,#4a2038_0%,#140910_72%)]",
  },
  {
    id: "tinder",
    title: "Discover",
    kicker: "Swipe",
    summary: "Tinder-style matches with spicy peek.",
    art: "bg-[radial-gradient(68%_72%_at_92%_82%,#d98aa6_0%,transparent_46%),linear-gradient(160deg,#351828,#120910)]",
  },
  {
    id: "tribute",
    title: "Tribute",
    kicker: "Challenges",
    summary: "Edge streaks unlock free dual-girl gens.",
    art: "bg-[radial-gradient(90%_80%_at_70%_20%,#e879f9_0%,transparent_50%),linear-gradient(160deg,#3b0764,#0c0a12)]",
  },
  {
    id: "roulette",
    title: "Roulette",
    kicker: "Sprint",
    summary: "Random girl + challenge · 8-minute goon.",
    art: "bg-[radial-gradient(80%_70%_at_30%_20%,#f472b6_0%,transparent_50%),linear-gradient(160deg,#4a1030,#0c0a12)]",
  },
  {
    id: "blindfold",
    title: "Blindfold",
    kicker: "Audio",
    summary: "Voice JOI until intimacy unlocks the image.",
    art: "bg-[radial-gradient(50%_50%_at_50%_40%,#52525b_0%,transparent_60%),linear-gradient(180deg,#18181b,#0a0a0a)]",
  },
  {
    id: "joi3d",
    title: "3D JOI Stage",
    kicker: "3D",
    summary: "Talking 3D stage — library girl or upload photo. Breath, sway, JOI scripts.",
    art: "bg-[radial-gradient(80%_70%_at_40%_20%,#ec4899_0%,transparent_50%),linear-gradient(165deg,#3b0764_0%,#0a0608_75%)]",
  },
  {
    id: "joi",
    title: "JOI",
    kicker: "JOI",
    summary: "Guided JOI sessions with timers.",
    art: "bg-[radial-gradient(56%_56%_at_50%_38%,#f7d5e2_0%,transparent_58%),linear-gradient(180deg,#2c1524,#0e090d)]",
  },
  {
    id: "room",
    title: "Goon Room",
    kicker: "Room",
    summary: "Timed sessions with one or two girls.",
    art: "bg-[radial-gradient(86%_60%_at_28%_100%,#8d3d5c_0%,transparent_52%),linear-gradient(200deg,#1a1018,#0b090c)]",
  },
  {
    id: "create",
    title: "Create",
    kicker: "Create",
    summary: "Build an original fictional character.",
    art: "bg-[radial-gradient(90%_80%_at_88%_12%,#f0d2b8_0%,transparent_42%),linear-gradient(200deg,#3a2438,#120c12)]",
  },
];

export function findSection(id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}
