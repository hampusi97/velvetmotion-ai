/** Compact mood-reactive boudoir SVG portrait generator — zero external 402 errors, < 1100 chars for Firestore SavedMedia schema compliance. */

export type PortraitMood =
  | "beauty"
  | "lingerie"
  | "nude"
  | "explicit"
  | "seductive";

const MOOD_THEMES: Record<
  PortraitMood,
  {
    bg1: string;
    bg2: string;
    accent: string;
    glow: string;
    badge: string;
    eyeY: number;
  }
> = {
  beauty: {
    bg1: "#1f1024",
    bg2: "#09050d",
    accent: "#f472b6",
    glow: "#fbbf24",
    badge: "BEAUTY",
    eyeY: 0,
  },
  lingerie: {
    bg1: "#3a0ca3",
    bg2: "#0a040c",
    accent: "#ec4899",
    glow: "#f43f5e",
    badge: "LINGERIE",
    eyeY: 1,
  },
  nude: {
    bg1: "#4c1130",
    bg2: "#0c0507",
    accent: "#fb7185",
    glow: "#f97316",
    badge: "UNCLOTHED",
    eyeY: 1,
  },
  explicit: {
    bg1: "#590d22",
    bg2: "#090206",
    accent: "#e11d48",
    glow: "#d946ef",
    badge: "INTENSE",
    eyeY: 3,
  },
  seductive: {
    bg1: "#2d0b38",
    bg2: "#08040b",
    accent: "#e879f9",
    glow: "#ec4899",
    badge: "SEDUCTIVE",
    eyeY: 2,
  },
};

const PALETTES = [
  { hair: "#160d18", skin: "#f2c6b6", shadow: "#c98b78", eye: "#60a5fa", lip: "#e11d48" },
  { hair: "#3b2314", skin: "#e5b59f", shadow: "#b87d65", eye: "#34d399", lip: "#f43f5e" },
  { hair: "#eab308", skin: "#f7d3c4", shadow: "#d19b88", eye: "#38bdf8", lip: "#ec4899" },
  { hair: "#7c2d12", skin: "#f4cbbd", shadow: "#c68f7b", eye: "#10b981", lip: "#be123c" },
  { hair: "#1e1b4b", skin: "#c68663", shadow: "#8d5234", eye: "#f59e0b", lip: "#db2777" },
];

function hashId(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function cleanText(str: string, max: number): string {
  return str.replace(/[^a-zA-Z0-9 ·,.-]/g, "").slice(0, max);
}

export function characterPortraitUrl(
  id: string,
  figure: string,
  mood: PortraitMood | string = "seductive",
  extraLabel?: string,
): string {
  const moodKey = (mood in MOOD_THEMES ? mood : "seductive") as PortraitMood;
  const t = MOOD_THEMES[moodKey];
  const h = hashId(`${id}:${figure}`);
  const p = PALETTES[h % PALETTES.length];
  const title = cleanText(id.replace(/^custom-/, "").toUpperCase() || "VELVET", 18);
  const sub = cleanText(extraLabel || figure || t.badge, 32);
  const ey = 392 + t.eyeY;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 768 1152'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${t.bg1}'/><stop offset='100%' stop-color='${t.bg2}'/></linearGradient></defs><rect width='768' height='1152' fill='url(#g)'/><circle cx='384' cy='430' r='310' fill='${t.glow}' opacity='.22'/><path d='M225 320C190 520 190 740 230 900L538 900C578 740 578 520 543 320C510 180 258 180 225 320Z' fill='${p.hair}'/><path d='M168 920C195 700 270 620 384 620C498 620 573 700 600 920L620 1080L148 1080Z' fill='${p.skin}' stroke='${t.accent}' stroke-width='2'/><rect x='344' y='500' width='80' height='145' rx='36' fill='${p.shadow}'/><path d='M276 335C276 235 492 235 492 335C492 455 438 542 384 548C330 542 276 455 276 335Z' fill='${p.skin}'/><ellipse cx='332' cy='${ey}' rx='18' ry='9' fill='#fff'/><circle cx='332' cy='${ey}' r='6' fill='${p.eye}'/><ellipse cx='436' cy='${ey}' rx='18' ry='9' fill='#fff'/><circle cx='436' cy='${ey}' r='6' fill='${p.eye}'/><path d='M352 486Q384 472 416 486Q384 508 352 486Z' fill='${p.lip}'/><path d='M220 710Q384 785 548 710L585 1080L183 1080Z' fill='${t.bg2}' opacity='${moodKey === "nude" || moodKey === "explicit" ? ".25" : ".85"}'/><text x='48' y='1020' fill='${t.accent}' font-family='sans-serif' font-size='16' font-weight='700'>${t.badge}</text><text x='48' y='1062' fill='#fff' font-family='serif' font-size='34' font-weight='700'>${title}</text><text x='48' y='1095' fill='#f9a8d4' font-family='sans-serif' font-size='16'>${sub}</text></svg>`
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");

  return `data:image/svg+xml;utf8,${svg}`;
}

/** Prefer live portrait or SVG portrait over broken external links. */
export function resolveAvatar(avatar: string, id: string, figure: string): string {
  if (avatar.startsWith("data:")) return avatar;
  return characterPortraitUrl(id, figure, "seductive");
}
