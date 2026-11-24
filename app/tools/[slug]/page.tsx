import { notFound } from "next/navigation";
import Link from "next/link";
import { EFFECTS, getEffect } from "@/data/effects";

export function generateStaticParams() {
  return EFFECTS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const effect = getEffect(slug);
  if (!effect) return {};
  return { title: effect.title, description: effect.description };
}

export default async function EffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const effect = getEffect(slug);
  if (!effect) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/tools/" className="text-xs text-pink-400">← All tools</Link>
      <h1 className="mt-2 text-2xl font-bold text-white">{effect.label}</h1>
      <p className="mt-2 text-sm text-zinc-400">{effect.description}</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#120f14] p-4 text-sm text-zinc-300">
        <p>Upload a photo in Studio, then pick this effect from the Tools tab.</p>
        <Link href="/studio/" className="mt-3 inline-block rounded-full bg-pink-500 px-4 py-2 text-xs font-bold text-white">Open Studio</Link>
      </div>
    </main>
  );
}
