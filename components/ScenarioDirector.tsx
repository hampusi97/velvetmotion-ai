"use client";

import { useState } from "react";
import { Drama, Heart, LockKeyhole, Sparkles } from "lucide-react";

type ScenarioCategory = "Romance" | "Drama" | "Power" | "Fantasy";
type Tone = "cinematic" | "intimate" | "high-stakes";

type Scenario = {
  id: string;
  label: string;
  description: string;
  category: ScenarioCategory;
  starter: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "slow-burn",
    label: "Slow-burn romance",
    category: "Romance",
    description: "Long-term chemistry and remembered details",
    starter: "Begin a slow-burn relationship story with natural dialogue, independent character goals, and meaningful continuity.",
  },
  {
    id: "late-night",
    label: "Midnight confession",
    category: "Romance",
    description: "A personal secret changes the atmosphere",
    starter: "Begin a late-night fictional scene in which you have something important to confess. Write vivid but natural dialogue and let me decide how to respond.",
  },
  {
    id: "affair",
    label: "Forbidden romance",
    category: "Drama",
    description: "Fictional cheating, secrecy, and consequences",
    starter: "Start a fictional adult romance drama involving an affair, conflicting loyalties, difficult decisions, and emotional consequences. Do not assume my character's choices.",
  },
  {
    id: "jealousy",
    label: "Jealousy & intrigue",
    category: "Drama",
    description: "Complicated feelings and shifting alliances",
    starter: "Start a fictional drama with jealousy, attraction, mixed signals, and meaningful stakes. Keep the characters nuanced rather than cruel caricatures.",
  },
  {
    id: "nonmonogamy",
    label: "Consensual non-monogamy",
    category: "Drama",
    description: "Explore an agreed relationship dynamic",
    starter: "Explore a fictional relationship among consenting adults who have explicitly negotiated a non-monogamous dynamic. Emphasize boundaries, trust, and meaningful emotional consequences.",
  },
  {
    id: "cuckold-drama",
    label: "Cuckold fantasy",
    category: "Power",
    description: "Consensual jealousy and relationship dynamics",
    starter: "Begin a fictional, consensually negotiated adult cuckold relationship drama focused on emotional tension and power dynamics. Everyone involved is an adult and has agreed to the scenario.",
  },
  {
    id: "role-reversal",
    label: "Power reversal",
    category: "Power",
    description: "Reimagine the balance of confidence and control",
    starter: "Begin an adult fictional scene in which confident characters negotiate a playful power reversal, with boundaries respected and no coercion.",
  },
  {
    id: "interracial",
    label: "Interracial romance",
    category: "Fantasy",
    description: "Character-driven adult fantasy without racial stereotypes",
    starter: "Begin a fictional interracial adult romance with independent characters, rich personalities, and clear mutual respect; never use racial dehumanization or stereotypes.",
  },
  {
    id: "bnwo-inspired",
    label: "BNWO-inspired drama",
    category: "Fantasy",
    description: "Fictional interracial relationship tension; no racial stereotypes",
    starter: "Begin a fictional adult interracial relationship drama centered on independently motivated characters, mutual agreement, and nuanced power dynamics. Avoid racial stereotypes, degradation, and dehumanization.",
  },
  {
    id: "luxury",
    label: "After-hours penthouse",
    category: "Fantasy",
    description: "Stylish, atmospheric and choice-driven",
    starter: "Set a romantic fictional scene in a penthouse after midnight, with lush atmosphere, believable motivations, and meaningful choices for the user.",
  },
];

const CATEGORIES: Array<ScenarioCategory | "All"> = ["All", "Romance", "Drama", "Power", "Fantasy"];

export function ScenarioDirector({
  companionName,
  disabled = false,
  onStart,
}: {
  companionName: string;
  disabled?: boolean;
  onStart: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ScenarioCategory | "All">("All");
  const [selectedId, setSelectedId] = useState(SCENARIOS[0].id);
  const [tone, setTone] = useState<Tone>("cinematic");
  const chosen = SCENARIOS.find((s) => s.id === selectedId) ?? SCENARIOS[0];
  const visible = SCENARIOS.filter((s) => category === "All" || s.category === category);

  return (
    <div className="rounded-xl border border-[#ff5678]/25 bg-gradient-to-r from-[#2b1222]/70 to-[#111117]/95 px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="vm-scenario-director"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-pink-100">
          <Drama className="h-4 w-4 text-[#ff5678]" /> Scene Director
          <span className="rounded-full bg-[#ff5678]/15 px-2 py-0.5 text-[10px] text-pink-300">
            Romance · Drama · Fantasy
          </span>
        </span>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Explore"} {open ? "−" : "+"}</span>
      </button>

      {open && (
        <div id="vm-scenario-director" className="mt-3 space-y-3">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Choose a fictional relationship dynamic with {companionName}. Every character is an adult. A connected chat model and its content rules determine the response.
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${category === c
                  ? "border-pink-400 bg-pink-500/20 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {visible.map((scene) => (
              <button
                key={scene.id}
                type="button"
                aria-pressed={selectedId === scene.id}
                onClick={() => setSelectedId(scene.id)}
                className={`rounded-xl border p-2.5 text-left transition ${selectedId === scene.id
                  ? "border-[#ff5678] bg-[#ff5678]/15"
                  : "border-white/10 bg-black/30 hover:border-white/30"}`}
              >
                <span className="block text-xs font-semibold text-white">{scene.label}</span>
                <span className="mt-1 block text-[10px] text-zinc-400">{scene.description}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              <Sparkles className="h-3.5 w-3.5 text-pink-300" />
              Tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="rounded-lg border border-white/15 bg-[#121118] px-2 py-1 text-xs text-white"
              >
                <option value="cinematic">Cinematic</option>
                <option value="intimate">Personal</option>
                <option value="high-stakes">High-stakes drama</option>
              </select>
            </label>
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff5678] to-[#a855f7] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              onClick={() => {
                const toneInstruction = tone === "intimate"
                  ? "Keep it personal and conversational."
                  : tone === "high-stakes"
                    ? "Make decisions feel consequential, but preserve user agency."
                    : "Use cinematic pacing and strong atmosphere.";
                onStart(`${chosen.starter} ${toneInstruction} All characters are fictional adults, and the user controls their own role.`);
                setOpen(false);
              }}
            >
              <Heart className="h-3.5 w-3.5" /> Start {chosen.label}
            </button>
          </div>
          <p className="flex items-center gap-1 text-[10px] text-zinc-500">
            <LockKeyhole className="h-3 w-3" />
            Optional fictional roleplay; not a real-world relationship service or a consent-verification system.
          </p>
        </div>
      )}
    </div>
  );
}
