export type SectionId =
  | "girls"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "room"
  | "suggest"
  | "gallery"
  | "packs";

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
    id: "girls",
    title: "Fictional Girls",
    kicker: "Cast",
    summary: "Browse fictional characters. Real people are never used.",
    art: "bg-[radial-gradient(120%_90%_at_18%_0%,#f8c9d8_0%,transparent_46%),linear-gradient(165deg,#4a2038_0%,#140910_72%)]",
  },
  {
    id: "create",
    title: "Create Girl",
    kicker: "Create",
    summary: "Build an original fictional character.",
    art: "bg-[radial-gradient(90%_80%_at_88%_12%,#f0d2b8_0%,transparent_42%),linear-gradient(200deg,#3a2438,#120c12)]",
  },
  {
    id: "romance",
    title: "Romance",
    kicker: "Romance",
    summary: "A slower romance mode with fictional partners.",
    art: "bg-[radial-gradient(80%_90%_at_50%_100%,#e7a0b8_0%,transparent_48%),linear-gradient(180deg,#2c1624,#10080e)]",
  },
  {
    id: "bnwo",
    title: "BNWO",
    kicker: "BNWO",
    summary: "Open the BNWO section.",
    art: "bg-[radial-gradient(70%_70%_at_8%_88%,#c45c7a_0%,transparent_50%),linear-gradient(145deg,#1b1020,#0c0a10)]",
  },
  {
    id: "tinder",
    title: "Tinder",
    kicker: "Tinder",
    summary: "Fictional swipe-style roleplay.",
    art: "bg-[radial-gradient(68%_72%_at_92%_82%,#d98aa6_0%,transparent_46%),linear-gradient(160deg,#351828,#120910)]",
  },
  {
    id: "joi",
    title: "JOI",
    kicker: "JOI",
    summary: "Open the JOI section.",
    art: "bg-[radial-gradient(56%_56%_at_50%_38%,#f7d5e2_0%,transparent_58%),linear-gradient(180deg,#2c1524,#0e090d)]",
  },
  {
    id: "room",
    title: "Goon Room",
    kicker: "Room",
    summary: "Open the Goon Room.",
    art: "bg-[radial-gradient(86%_60%_at_28%_100%,#8d3d5c_0%,transparent_52%),linear-gradient(200deg,#1a1018,#0b090c)]",
  },
  {
    id: "suggest",
    title: "Suggest",
    kicker: "Ideas",
    summary: "Suggest a feature for VelvetMotion.",
    art: "bg-[radial-gradient(76%_64%_at_74%_0%,#e6c7a2_0%,transparent_44%),linear-gradient(160deg,#2a1c22,#100c10)]",
  },
  {
    id: "gallery",
    title: "Gallery",
    kicker: "Gallery",
    summary: "Your personal gallery.",
    art: "bg-[radial-gradient(42%_42%_at_28%_28%,#f4b4cb_0%,transparent_52%),radial-gradient(46%_46%_at_74%_72%,#6e3048_0%,transparent_48%),linear-gradient(180deg,#1a1016,#0c090c)]",
  },
  {
    id: "packs",
    title: "Story Packs",
    kicker: "Packs",
    summary: "Packaged fictional stories. Still loading.",
    art: "bg-[radial-gradient(90%_80%_at_0%_0%,#f0c2a0_0%,transparent_42%),linear-gradient(150deg,#3d2030,#11090e)]",
  },
];

export function findSection(id: SectionId): Section {
  const section = sections.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Unknown section: ${id}`);
  }
  return section;
}
