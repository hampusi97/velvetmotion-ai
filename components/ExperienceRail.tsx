"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Film, HeartHandshake, MessagesSquare, Sparkles } from "lucide-react";

const DESTINATIONS = [
  {
    href: "/create/",
    eyebrow: "01 / Create",
    title: "Make her yours",
    detail: "Build a fictional adult companion with a look, voice, and personality that feels distinct.",
    icon: Sparkles,
    color: "from-[#ff5678]/25 via-[#4b1a3c]/40 to-transparent",
    accent: "text-[#ff93b2]",
  },
  {
    href: "/discover/",
    eyebrow: "02 / Connect",
    title: "Real conversations",
    detail: "Explore characters, start a scene, and shape an ongoing story with memory and choice.",
    icon: MessagesSquare,
    color: "from-[#8b5cf6]/25 via-[#302051]/30 to-transparent",
    accent: "text-[#c4b5fd]",
  },
  {
    href: "/studio/",
    eyebrow: "03 / Create media",
    title: "Portrait to motion",
    detail: "Upload permitted adult artwork, create portraits, or animate with a compatible video backend.",
    icon: Film,
    color: "from-[#ec4899]/25 via-[#422038]/35 to-transparent",
    accent: "text-[#f9a8d4]",
  },
  {
    href: "/download/",
    eyebrow: "04 / Local mode",
    title: "Bring your own power",
    detail: "Use your computer's RAM and GPU with local engines where supported.",
    icon: Cpu,
    color: "from-[#22d3ee]/20 via-[#12333a]/35 to-transparent",
    accent: "text-[#67e8f9]",
  },
] as const;

/** Original VelvetMotion experience navigation — no third-party site assets. */
export function ExperienceRail() {
  return (
    <section aria-labelledby="vm-experience-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#ff91ac]">VelvetMotion / Your experience</p>
          <h2 id="vm-experience-title" className="mt-1 font-display text-xl font-extrabold text-white sm:text-2xl">
            Your story, your rules.
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1 text-[10px] text-pink-200">
          <HeartHandshake className="h-3 w-3" /> Fictional adults only
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {DESTINATIONS.map((destination) => {
          const Icon = destination.icon;
          return (
            <Link
              href={destination.href}
              key={destination.href}
              className="group relative flex min-h-[150px] flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#14121a] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-pink-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-300"
            >
              <span className={`absolute inset-0 bg-gradient-to-br ${destination.color} opacity-80 transition-opacity group-hover:opacity-100`} aria-hidden="true" />
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{destination.eyebrow}</span>
                <Icon className={`h-4 w-4 ${destination.accent}`} aria-hidden="true" />
              </div>
              <div className="relative mt-auto pt-5">
                <h3 className="flex items-center gap-1 text-sm font-bold text-white sm:text-base">
                  {destination.title}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{destination.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
