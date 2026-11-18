/** Vertical Shorts series — Candy pattern: multi-episode, genre tags, free first eps. */

export type ShortsEpisode = {
  id: string;
  title: string;
  free: boolean;
  frames: number;
  spicy: boolean;
};

export type ShortsSeries = {
  id: string;
  title: string;
  genre: string;
  characterHint: string;
  blurb: string;
  episodes: ShortsEpisode[];
};

export const SHORTS_SERIES: ShortsSeries[] = [
  {
    id: "yes-maam",
    title: "Yes, Ma'am",
    genre: "Dominant",
    characterHint: "military-dominant",
    blurb: "She gives the orders. You follow.",
    episodes: [
      { id: "ym-1", title: "First inspection", free: true, frames: 4, spicy: false },
      { id: "ym-2", title: "Kneel", free: true, frames: 4, spicy: true },
      { id: "ym-3", title: "Hold it", free: true, frames: 4, spicy: true },
      { id: "ym-4", title: "Dismissed", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "neighbor-key",
    title: "The Neighbor's Key",
    genre: "Neighbor",
    characterHint: "girl-next-door",
    blurb: "She borrowed sugar. She kept the key.",
    episodes: [
      { id: "nk-1", title: "Wrong door", free: true, frames: 4, spicy: false },
      { id: "nk-2", title: "Night visit", free: true, frames: 4, spicy: true },
      { id: "nk-3", title: "Quiet", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "cuck-toast",
    title: "Toast to Him",
    genre: "Cuckold",
    characterHint: "BNWO",
    blurb: "BNWO dinner party. You're pouring the drinks.",
    episodes: [
      { id: "ct-1", title: "Guest list", free: true, frames: 4, spicy: true },
      { id: "ct-2", title: "Under the table", free: true, frames: 4, spicy: true },
      { id: "ct-3", title: "Dessert", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "joi-nights",
    title: "JOI Nights",
    genre: "JOI",
    characterHint: "joi-coach",
    blurb: "Edge with her. Don't finish until she says.",
    episodes: [
      { id: "jn-1", title: "Warm-up", free: true, frames: 4, spicy: true },
      { id: "jn-2", title: "Edge", free: true, frames: 4, spicy: true },
      { id: "jn-3", title: "Countdown", free: true, frames: 4, spicy: true },
      { id: "jn-4", title: "Release", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "stepsister",
    title: "House Rules",
    genre: "Taboo",
    characterHint: "brat",
    blurb: "She moved back in. The walls are thin.",
    episodes: [
      { id: "ss-1", title: "Shared bathroom", free: true, frames: 4, spicy: true },
      { id: "ss-2", title: "Locked door", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "sph-desk",
    title: "Desk Evaluation",
    genre: "SPH",
    characterHint: "office-dominant",
    blurb: "She rates you. You stay seated.",
    episodes: [
      { id: "sd-1", title: "First look", free: true, frames: 4, spicy: true },
      { id: "sd-2", title: "Measurements", free: true, frames: 4, spicy: true },
      { id: "sd-3", title: "Verdict", free: true, frames: 4, spicy: true },
    ],
  },
  {
    id: "blindfold-hour",
    title: "Blindfold Hour",
    genre: "Sensory",
    characterHint: "sensual-guide",
    blurb: "Eyes closed. Follow her voice.",
    episodes: [
      { id: "bh-1", title: "The cloth", free: true, frames: 4, spicy: true },
      { id: "bh-2", title: "Touch only", free: true, frames: 4, spicy: true },
      { id: "bh-3", title: "Open", free: true, frames: 4, spicy: true },
    ],
  },
];

export const SHORTS_GENRES = Array.from(new Set(SHORTS_SERIES.map((s) => s.genre)));
