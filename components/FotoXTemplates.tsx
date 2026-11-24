"use client";

import { useMemo, useState } from "react";
import { Play, Sparkles } from "lucide-react";

export type TemplateCategory =
  | "All"
  | "Undress"
  | "Blowjob"
  | "Doggy"
  | "Cowgirl"
  | "Missionary"
  | "Solo"
  | "Shower"
  | "JOI"
  | "Breeding";

export interface SceneTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  duration: 5 | 8 | 10 | 15;
  prompt: string;
  isNew?: boolean;
  isUltra?: boolean;
}

const TEMPLATES: SceneTemplate[] = [
  { id: "undress-slow", title: "Slow Undress", category: "Undress", duration: 8, prompt: "slow undress, clothes falling, looking at camera, soft light, photoreal adult", isNew: true },
  { id: "shower-doggy", title: "Shower Doggy", category: "Doggy", duration: 5, prompt: "shower doggy style, wet skin, steam, photoreal adult", isUltra: true },
  { id: "kitchen-cowgirl", title: "Kitchen Cowgirl", category: "Cowgirl", duration: 10, prompt: "cowgirl on kitchen counter, natural light, photoreal adult", isNew: true },
  { id: "sofa-ride", title: "Sofa Ride", category: "Cowgirl", duration: 15, prompt: "sofa squat ride, looking at camera, photoreal adult", isUltra: true },
  { id: "bj-close", title: "Close Blowjob", category: "Blowjob", duration: 5, prompt: "close up oral, looking at camera, photoreal adult" },
  { id: "missionary-bed", title: "Missionary Bed", category: "Missionary", duration: 10, prompt: "missionary on bed, eye contact, photoreal adult" },
  { id: "solo-touch", title: "Solo Touch", category: "Solo", duration: 8, prompt: "solo, touching herself, bedroom, photoreal adult", isNew: true },
  { id: "towel-drop", title: "Towel Drop", category: "Undress", duration: 5, prompt: "towel drop, nude reveal, bathroom, photoreal adult" },
  { id: "joi-edge", title: "JOI Edge", category: "JOI", duration: 10, prompt: "JOI, looking at camera, dirty talk expression, photoreal adult" },
  { id: "breeding", title: "Breeding Finish", category: "Breeding", duration: 15, prompt: "intimate breeding finish, bedroom, photoreal adult", isUltra: true },
  { id: "doggy-bed", title: "Bed Doggy", category: "Doggy", duration: 8, prompt: "doggy on bed, looking back, photoreal adult" },
  { id: "lingerie-tease", title: "Lingerie Tease", category: "Undress", duration: 5, prompt: "lingerie tease then undress, soft light, photoreal adult" },
];

const CATS: TemplateCategory[] = ["All", "Undress", "Blowjob", "Doggy", "Cowgirl", "Missionary", "Solo", "Shower", "JOI", "Breeding"];

export function FotoXTemplates({
  onPick,
}: {
  onPick: (template: SceneTemplate) => void;
}) {
  const [cat, setCat] = useState<TemplateCategory>("All");
  const items = useMemo(
    () => (cat === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat)),
    [cat],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[11px] text-pink-100">
        <strong>Scene Templates:</strong> Pick a scene, then generate from your uploaded photo or a fictional girl. Explicit results work best with a local engine.
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${
              cat === c ? "border-pink-400 bg-pink-500/20 text-white" : "border-white/15 text-zinc-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#120f14] text-left"
          >
            <div className="aspect-[3/4] bg-gradient-to-b from-pink-500/20 to-black/60" />
            <div className="absolute left-2 top-2 flex gap-1">
              {t.isNew && <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}
              {t.isUltra && <span className="rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-black">ULTRA</span>}
              <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">{t.duration}s</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-2">
              <div className="text-xs font-bold text-white">{t.title}</div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-300">
                <span>{t.category}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white group-hover:bg-pink-500">
                  <Play className="h-3 w-3" /> Generate
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> Templates set the prompt and switch to Video. Upload your photo first for Self-Avatar.
      </p>
    </div>
  );
}
