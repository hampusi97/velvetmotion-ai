import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cpu, Sparkles } from "lucide-react";
import { OnlineAiGitHubBridge } from "@/components/OnlineAiGitHubBridge";

export const metadata: Metadata = {
  title: "Online AI → GitHub Builder | VelvetMotion AI",
  description:
    "Connect any online Uncensored AI chat directly to your hampusi97/velvetmotion-ai GitHub repository to write, verify, and commit code.",
};

export default function OnlineBuilderPage() {
  return (
    <main className="min-h-screen bg-[#0b0812] px-4 py-9 text-[#f8eef2] sm:px-6 lg:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#e9b9ca] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> VelvetMotion Home
          </Link>
          <a
            href="https://github.com/hampusi97/velvetmotion-ai/actions/workflows/uncensored-ai.yml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200 hover:border-[#ff1e8e]/50"
          >
            <Cpu className="h-4 w-4 text-[#00f5ff]" /> GitHub Autonomous Runner
          </a>
        </header>

        <section className="rounded-[28px] border border-[#ff1e8e]/25 bg-gradient-to-br from-[#2a1529] via-[#171122] to-[#0e0b16] p-6 sm:p-9 space-y-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff85c0]">
            <Sparkles className="h-4 w-4" /> Online Uncensored AI ↔ GitHub Bridge
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Build your GitHub repo with any Online Uncensored AI.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
            Copy your live repository context into any online Uncensored AI website, paste its reply back here, and
            push the code straight into <code className="text-[#00f5ff]">hampusi97/velvetmotion-ai</code> with
            automatic TypeScript &amp; Python verification.
          </p>
        </section>

        <OnlineAiGitHubBridge />
      </div>
    </main>
  );
}
