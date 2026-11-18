"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Sparkles, BookOpen, MessageCircleHeart } from "lucide-react";
import { riseItem } from "@/lib/motion";
import type { Section, ViewId } from "@/lib/sections";
import { CHARACTERS } from "@/lib/characters";
import { ALL_STORY_PACKS, ALL_JOI_PRESETS } from "@/lib/content";
import { characterPortraitUrl } from "@/lib/portraits";
import { ArrowIcon } from "./icons";

export function SectionView({
  section,
  onHome,
  onNavigate,
  onOpenGirl,
  onOpenPack,
  onOpenJoi,
}: {
  section: Section;
  onHome: () => void;
  onNavigate?: (view: ViewId) => void;
  onOpenGirl?: (id: string) => void;
  onOpenPack?: (packId: string) => void;
  onOpenJoi?: (scenarioId: string) => void;
}) {
  const reduce = useReducedMotion();
  const [selectedIntensity, setSelectedIntensity] = useState<"all" | "dominant" | "intense">("all");

  const featuredCompanions = CHARACTERS.filter((c) => {
    if (selectedIntensity === "dominant") return c.category === "Dominant";
    if (selectedIntensity === "intense") return c.category === "Intense" || c.category === "Bold";
    return ["Dominant", "Intense", "Bold", "Brat"].includes(c.category);
  });

  const featuredPacks = ALL_STORY_PACKS.filter((p) => ["BNWO", "SPH", "CUCK"].includes(p.tag)).slice(0, 5);
  const featuredJoi = ALL_JOI_PRESETS.slice(-4);

  return (
    <motion.article
      data-motion
      variants={riseItem}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="pb-8 pt-6 md:pt-10 space-y-6"
    >
      <div>
        <button
          type="button"
          onClick={onHome}
          className="press mb-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-base font-medium text-cream"
        >
          <ArrowIcon className="h-4 w-4 rotate-180" />
          Home
        </button>
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-card">
          <div className={`relative aspect-[16/10] sm:aspect-[16/7] ${section.art}`}>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-ink-950/10"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 md:p-10">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-rose-100">
                {section.kicker}
              </p>
              <h1 className="mt-2 max-w-[14ch] font-display text-4xl leading-[0.95] tracking-[-0.03em] text-cream sm:text-5xl md:text-6xl">
                {section.title}
              </h1>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-ink-800 p-5 shadow-card sm:p-6 md:p-8">
          <p className="max-w-2xl text-lg leading-relaxed text-cream">{section.summary}</p>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            High-intensity power dynamics, commanding companions, and consensual adult fantasy arcs. Pick a dominant companion below or launch a guided scenario.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "dominant", "intense"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedIntensity(mode)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedIntensity === mode
                    ? "border-pink-500 bg-pink-500/20 text-pink-200"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-pink-500/40"
                }`}
              >
                {mode === "all"
                  ? "All Power Dynamics"
                  : mode === "dominant"
                    ? "Strict Dominant"
                    : "Intense & Bold"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Companions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-cream">
            <Flame className="h-5 w-5 text-pink-400" />
            Commanding Companions
          </h2>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("girls")}
              className="text-xs text-pink-300 hover:text-pink-200"
            >
              View full roster →
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {featuredCompanions.map((girl) => {
            const img = characterPortraitUrl(girl.id, girl.figure);
            return (
              <div
                key={girl.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60"
              >
                <div className="relative aspect-[3/4] bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={girl.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
                    <div className="font-semibold text-sm text-white">
                      {girl.name}, {girl.age}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-pink-300">
                      {girl.category}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-3 space-y-3">
                  <p className="text-xs text-zinc-400 line-clamp-2">{girl.kink}</p>
                  <button
                    type="button"
                    onClick={() => onOpenGirl?.(girl.id)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 py-2 text-xs font-medium text-white"
                  >
                    <MessageCircleHeart className="h-3.5 w-3.5" />
                    Chat with {girl.name.split(" ")[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Curated Story Packs & JOI */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-ink-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-cream">
              <BookOpen className="h-4 w-4 text-pink-400" />
              Intense Story Packs
            </h3>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("packs")}
                className="text-xs text-pink-300 hover:underline"
              >
                Open Story Packs →
              </button>
            )}
          </div>
          <div className="space-y-2">
            {featuredPacks.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{pack.title}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {pack.tag} · {pack.desc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (onOpenPack ? onOpenPack(pack.id) : onNavigate?.("packs"))}
                  className="shrink-0 rounded-xl border border-pink-500/40 bg-pink-500/10 px-3 py-1.5 text-xs text-pink-200 hover:bg-pink-500/20"
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-ink-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-cream">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              Guided JOI & Tributes
            </h3>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("tribute")}
                className="text-xs text-fuchsia-300 hover:underline"
              >
                Tribute Challenges →
              </button>
            )}
          </div>
          <div className="space-y-2">
            {featuredJoi.map((joi) => (
              <div
                key={joi.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{joi.label}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {joi.persona.name} · {joi.tone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (onOpenJoi ? onOpenJoi(joi.id) : onNavigate?.("joi"))}
                  className="shrink-0 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
