import Link from "next/link";
import { EFFECTS } from "@/data/effects";

export const metadata = {
  title: "Photo Tools — VelvetMotion",
  description: "Undress, style, and scene tools. Upload a photo and pick an effect.",
};

export default function ToolsIndex() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white">Photo Tools</h1>
      <p className="mt-2 text-sm text-zinc-400">Pick an effect. Face stays locked. Explicit works best with a local engine.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {EFFECTS.map((e) => (
          <Link key={e.slug} href={`/tools/${e.slug}/`} className="rounded-2xl border border-white/10 bg-[#120f14] p-4 hover:border-pink-400/50">
            <div className="text-sm font-bold text-white">{e.label}</div>
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{e.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
