"use client";

import Link from "next/link";
import type { CompanionProfile } from "@/data/companions";

export default function CompanionCard({ c, index }: { c: CompanionProfile; index: number }) {
  const tags = c.kink?.tags?.slice(0, 3) ?? [c.category];
  return (
    <Link href={`/chat/?character=${c.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#12100e]">
        <span className="absolute left-4 top-4 z-10 text-[10px] tracking-[0.2em] uppercase text-[#a89c8d]">
          No. {String(index + 1).padStart(2, "0")}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.portraitUrl}
          alt={c.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,0.68,0.16,1)] group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-serif text-2xl font-light text-[#f6f1e8]">{c.name}</h3>
          <p className="mt-1 text-sm text-[#a89c8d]">{c.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="border border-white/10 px-2 py-1 text-[10px] tracking-[0.15em] uppercase text-[#a89c8d]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
