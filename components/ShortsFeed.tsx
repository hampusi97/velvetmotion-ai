"use client";

import { useMemo, useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl, joiSequenceFrames, sexSequenceFrames } from "@/lib/media";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";

type ShortEp = {
  id: string;
  title: string;
  series: string;
  characterId: string;
  spicy: boolean;
  blurb: string;
};

const SERIES: ShortEp[] = [
  {
    id: "s1e1",
    title: "House rules — Episode 1",
    series: "House Rules",
    characterId: "diana-m",
    spicy: true,
    blurb: "She writes the rules. You break them. She notices.",
  },
  {
    id: "s1e2",
    title: "After the stream",
    series: "Private Room",
    characterId: "nova-p",
    spicy: true,
    blurb: "Lights off. Cam still on — for you only.",
  },
  {
    id: "s1e3",
    title: "Passenger seat",
    series: "Late Ride",
    characterId: "dalia-r",
    spicy: true,
    blurb: "Tinted windows. Phone out. No destination.",
  },
  {
    id: "s1e4",
    title: "Best friend problem",
    series: "Don't Tell",
    characterId: "lisa-k",
    spicy: true,
    blurb: "She said it was a joke. The video wasn't.",
  },
  {
    id: "s1e5",
    title: "Headphones off",
    series: "Quiet Girl",
    characterId: "suzu-m",
    spicy: false,
    blurb: "Soft voice. Explicit ask. First nude.",
  },
  {
    id: "s1e6",
    title: "JOI countdown",
    series: "Blindfold",
    characterId: "scarlett",
    spicy: true,
    blurb: "You don't finish until she counts to one.",
  },
  {
    id: "s1e7",
    title: "Golden hour private",
    series: "Influencer Set",
    characterId: "mila-s",
    spicy: true,
    blurb: "Public post was tame. This folder isn't.",
  },
  {
    id: "s1e8",
    title: "Hotel stranger",
    series: "Date Night",
    characterId: "livia-n",
    spicy: true,
    blurb: "Key card on the table. Clothes on the floor.",
  },
];

export function ShortsFeed({
  onHome,
  onChat,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
}) {
  const [active, setActive] = useState(0);
  const ep = SERIES[active % SERIES.length];
  const character =
    CHARACTERS.find((c) => c.id === ep.characterId) || CHARACTERS[0];

  const frames = useMemo(() => {
    if (ep.spicy) return sexSequenceFrames(character);
    return joiSequenceFrames(character);
  }, [character, ep.spicy, ep.id]);

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <h1 className="font-display text-xl text-cream">Velvet Shorts</h1>
        <span className="text-xs text-zinc-500">{active + 1}/{SERIES.length}</span>
      </div>

      <div className="relative aspect-[9/16] max-h-[70vh] rounded-3xl overflow-hidden border border-pink-500/40 bg-black shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        <MotionSequencePlayer frames={frames} alt={ep.title} />
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
          {ep.spicy && (
            <span className="inline-block rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white mb-2">
              SPICY
            </span>
          )}
          <div className="text-xs uppercase tracking-widest text-pink-300">{ep.series}</div>
          <div className="text-lg font-semibold text-white mt-1">{ep.title}</div>
          <p className="text-sm text-zinc-300 mt-1">{ep.blurb}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onChat(character.id)}
              className="flex-1 rounded-full bg-pink-600 py-2.5 text-sm font-semibold"
            >
              Chat with {character.name.split(" ")[0]}
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => a + 1)}
              className="rounded-full border border-white/20 px-4 py-2.5 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {SERIES.map((s, i) => {
          const c = CHARACTERS.find((x) => x.id === s.characterId) || CHARACTERS[0];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 w-20 rounded-xl overflow-hidden border ${
                i === active % SERIES.length ? "border-pink-500" : "border-white/10"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterMediaUrl(c, "beauty")}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              <div className="text-[9px] p-1 truncate text-zinc-400">{s.series}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
