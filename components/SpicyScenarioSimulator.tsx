"use client";

import { useState } from "react";
import { Sparkles, Flame, Lock, Play } from "lucide-react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { addCoins, getCoins } from "@/lib/storage";

const SCENARIOS = [
  {
    id: "penthouse-master",
    title: "Penthouse Master & Servant",
    category: "Dominant",
    tagline: "Kneel by the floor-to-ceiling glass while she dictates every breath.",
    prompt: "You enter her private penthouse suite. She is waiting by the window in sheer black lace, demanding you drop to your knees and wait for permission to speak.",
    intensity: "Extreme",
  },
  {
    id: "office-after-hours",
    title: "After-Hours Corner Office",
    category: "Brat / Tease",
    tagline: "Locked boardroom doors, towering heels, and zero professional boundaries.",
    prompt: "Everyone has left the floor. She locks the glass boardroom door, sits on the edge of the mahogany desk, and motions for you to step between her thighs.",
    intensity: "Hot",
  },
  {
    id: "dressing-room-risk",
    title: "VIP Dressing Room Risk",
    category: "Exhibition",
    tagline: "Half-undressed behind silk curtains while people walk past outside.",
    prompt: "The curtain is pulled half back. She is trying on a silk corset, pressing you against the velvet wall with her hips as whispers echo just outside.",
    intensity: "Extreme",
  },
  {
    id: "midnight-bunk",
    title: "Snowed-In Cabin Fireplace",
    category: "Romantic",
    tagline: "Blizzard outside, roaring fire, skin-to-skin warmth by the rug.",
    prompt: "The snow is howling against the cabin windows. The lights flickered out. She is lying on the bearskin rug wearing only an oversized sweater, pulling you down beside her.",
    intensity: "Sensual",
  },
];

export function SpicyScenarioSimulator({
  onStartChat,
  onHome,
}: {
  onStartChat: (characterId: string, customPrompt?: string) => void;
  onHome: () => void;
}) {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [customBrief, setCustomBrief] = useState("");
  const [coins, setCoins] = useState(() => (typeof window !== "undefined" ? getCoins() : 500));

  const launch = () => {
    addCoins(10);
    setCoins(getCoins());
    onStartChat(selectedChar.id, customBrief.trim() || selectedScenario.prompt);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>

      <div>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-pink-400 font-semibold">
          <Flame className="h-4 w-4 text-rose-500 animate-pulse" /> Advanced NSFW Fantasy Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent mt-1">
          Spicy Scenario Simulator
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Launch hyper-immersive erotic scenarios with any companion. Zero censorship, custom power dynamics, and instant uninhibited chat.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SCENARIOS.map((s) => {
          const active = selectedScenario.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedScenario(s)}
              className={`text-left rounded-3xl border p-4 transition flex flex-col justify-between ${
                active
                  ? "border-pink-500 bg-gradient-to-br from-pink-950/40 to-zinc-950 shadow-lg shadow-pink-500/15"
                  : "border-white/10 bg-zinc-900/40 hover:border-pink-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">{s.title}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/30">
                    {s.intensity}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{s.tagline}</p>
              </div>
              <div className="mt-4 text-[11px] text-pink-300 font-medium">
                {active ? "Selected scenario ✓" : "Click to select"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-400" /> Configure Companion & Dynamic
        </h3>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Select Companion</label>
          <select
            value={selectedChar.id}
            onChange={(e) => {
              const c = CHARACTERS.find((x) => x.id === e.target.value);
              if (c) setSelectedChar(c);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
          >
            {CHARACTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.category} · {c.kink})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Scenario Opening / Custom Erotic Prompt (Optional)</label>
          <textarea
            rows={3}
            value={customBrief}
            onChange={(e) => setCustomBrief(e.target.value)}
            placeholder={selectedScenario.prompt}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 text-xs text-white outline-none focus:border-pink-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-amber-300 font-medium">{coins} coins available (+10 bonus on start)</span>
          <button
            type="button"
            onClick={launch}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 transition"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Launch Spicy Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
