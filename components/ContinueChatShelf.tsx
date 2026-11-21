"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { allCharacters, type Character } from "@/lib/characters";
import { listRecentConversationIds } from "@/lib/db";
import { listLocalConversationIds } from "@/lib/storage";

const SHELF_LIMIT = 3;

export function ContinueChatShelf() {
  const [companions, setCompanions] = useState<Character[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const catalog = new Map(allCharacters().map((character) => [character.id, character]));
      const ids = new Set(catalog.keys());
      const indexed = await listRecentConversationIds(ids, SHELF_LIMIT).catch(() => []);
      for (const id of indexed) ids.delete(id);
      const older = listLocalConversationIds(ids, SHELF_LIMIT - indexed.length);
      if (active) {
        setCompanions([...indexed, ...older].flatMap((id) => {
          const character = catalog.get(id);
          return character ? [character] : [];
        }));
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (companions.length === 0) return null;

  return (
    <section aria-labelledby="continue-chatting" className="mt-6 rounded-3xl border border-rose-200/15 bg-[#211722] px-4 py-4 text-rose-50 sm:mt-8 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="continue-chatting" className="font-display text-2xl tracking-tight sm:text-3xl">Continue chatting</h2>
        <Link href="/companions/?saved=1" prefetch={false}
          className="rounded-md text-sm font-medium text-rose-200 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300">
          Saved companions
        </Link>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {companions.map((companion) => (
          <li key={companion.id} className="min-w-0">
            <Link href={`/chat/?companion=${encodeURIComponent(companion.id)}`} prefetch={false}
              aria-label={`Continue chat with ${companion.name}`}
              className="group flex items-center gap-3 rounded-2xl border border-rose-200/15 bg-[#160f19] px-3 py-2 hover:border-rose-200/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">
              <SafeImage src={companion.avatar} alt="" loading="lazy" width={44} height={52}
                className="h-[52px] w-11 shrink-0 rounded-xl object-cover object-top" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{companion.name}</span>
                <span className="block truncate text-xs text-rose-100/70">{companion.category}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-200 group-hover:text-white" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
