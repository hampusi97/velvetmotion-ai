"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, ChevronRight, CircleHelp, Copy, Cpu, Image as ImageIcon,
  Mic2, Monitor, Settings2, ShieldCheck, Sparkles, Volume2,
} from "lucide-react";
import type { LocalEngineStatus } from "@/lib/localEngineBridge";

type Engine = "chat" | "picture" | "voice";

const GUIDES: Record<Engine, {
  name: string;
  title: string;
  summary: string;
  url: string;
  service: string;
  instructions: string[];
  command: string;
}> = {
  chat: {
    name: "Conversation",
    title: "Connect an Ollama chat model",
    summary: "Run conversations on your computer's CPU, RAM and supported GPU.",
    url: "https://ollama.com/download",
    service: "Ollama",
    instructions: [
      "Install Ollama from its official website. The model software is separate from VelvetMotion.",
      "Open Ollama and start a compatible language model using the Ollama app or terminal.",
      "Return here and select Test connection. In chat settings, choose Local or Auto.",
    ],
    command: "ollama list",
  },
  picture: {
    name: "Pictures",
    title: "Connect a ComfyUI image model",
    summary: "Create portraits with supported local image checkpoints and workflows.",
    url: "https://www.comfy.org/download",
    service: "ComfyUI",
    instructions: [
      "Install ComfyUI from its official project. It needs an image model that fits your GPU.",
      "Download and load a compatible checkpoint and generation workflow, then start ComfyUI.",
      "Return here to check the local service. A green check means reachable, not that image generation has been tested.",
    ],
    command: "http://127.0.0.1:8188",
  },
  voice: {
    name: "Neural voice",
    title: "Connect a compatible speech engine",
    summary: "Use your own TTS server when licensed neural voices are installed.",
    url: "https://github.com/remsky/Kokoro-FastAPI",
    service: "Kokoro-compatible TTS",
    instructions: [
      "Install a Kokoro-compatible TTS service from a trusted provider and review its documentation.",
      "Start the speech service using its documented command with the compatible voice models installed.",
      "Neural preview connects to the speech endpoint at 127.0.0.1:8880; otherwise browser speech remains available.",
    ],
    command: "http://127.0.0.1:8880/docs",
  },
};

export function LocalSetupWizard({
  status,
  onRefresh,
}: {
  status: LocalEngineStatus;
  onRefresh: () => Promise<void>;
}) {
  const [selection, setSelection] = useState<Engine>("chat");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const guide = GUIDES[selection];
  const online = selection === "chat"
    ? status.ollamaOnline || status.koboldOnline
    : selection === "picture"
      ? status.comfyOnline
      : status.kokoroOnline || status.fishOnline;
  const iconMap = { chat: Cpu, picture: ImageIcon, voice: Mic2 };

  const check = async () => {
    setTesting(true);
    try { await onRefresh(); }
    finally { setTesting(false); }
  };

  return (
    <section aria-labelledby="local-wizard-title" className="space-y-5 rounded-[30px] border border-[#ddb0bf]/15 bg-gradient-to-br from-[#221626] to-[#131119] p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#e6aaba]">Your own compute</p>
          <h2 id="local-wizard-title" className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">Local AI, without the guesswork.</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">
            Start with one capability. VelvetMotion helps you connect to software you run independently on your machine.
            It cannot silently install AI models or access arbitrary RAM through a website.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/15 bg-rose-300/10 px-3 py-1.5 text-[11px] text-[#f0c8d2]">
          <ShieldCheck className="h-3.5 w-3.5" /> Local-first by choice
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(GUIDES) as Engine[]).map((key) => {
          const Icon = iconMap[key];
          return (
            <button type="button" key={key} aria-pressed={selection === key}
              onClick={() => { setSelection(key); setCopied(false); }}
              className={"rounded-2xl border px-2 py-3 text-center transition sm:px-4 " +
                (selection === key ? "border-[#e2a7b9]/60 bg-[#b35d81]/20 text-white" : "border-white/10 bg-white/[.025] text-zinc-300 hover:border-white/20")}>
              <Icon className="mx-auto mb-1.5 h-5 w-5 text-[#efb8c5]" aria-hidden="true" />
              <span className="text-[11px] font-bold sm:text-sm">{GUIDES[key].name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_.72fr]">
        <div className="rounded-[23px] border border-white/10 bg-[#0f0c14]/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">{guide.title}</h3>
              <p className="mt-1 text-xs text-[#bcaebb]">{guide.summary}</p>
            </div>
            <span className={"shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold " + (online
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
              : "border-zinc-400/15 bg-white/[.035] text-zinc-300")}>
              {online ? "Detected" : "Not detected"}
            </span>
          </div>

          <ol className="mt-5 space-y-4">
            {guide.instructions.map((instruction, index) => (
              <li key={instruction} className="flex gap-3 text-xs leading-6 text-zinc-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e2a7b9]/20 bg-[#b35d81]/15 text-[10px] font-bold text-[#ffd4de]">{index + 1}</span>
                {instruction}
              </li>
            ))}
          </ol>
          <a target="_blank" rel="noopener noreferrer" href={guide.url}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#cc7491] to-[#a25a82] px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110">
            Visit official {guide.service} setup <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="space-y-4 rounded-[23px] border border-white/10 bg-[#0f0c14]/70 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Monitor className="h-4 w-4 text-[#e8b8c5]" /> Connection test
          </h3>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-3">
            {online ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleHelp className="h-4 w-4 text-amber-200" />}
            <span className="text-xs text-zinc-300">{online ? "Local service responded" : "Start the local service, then test again"}</span>
          </div>
          <button type="button" disabled={testing} onClick={() => void check()}
            className="w-full rounded-full border border-[#ebbad0]/30 bg-[#bb6784]/20 px-4 py-2.5 text-xs font-bold text-[#ffe0e8] hover:bg-[#bb6784]/30 disabled:opacity-60">
            {testing ? "Checking..." : "Test connection again"}
          </button>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {selection === "chat" ? "Optional terminal check" : "Local endpoint"}
            </span>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
              <code className="min-w-0 truncate text-[11px] text-[#f4c4d0]">{guide.command}</code>
              <button type="button" aria-label="Copy local model command" onClick={async () => {
                try { await navigator.clipboard.writeText(guide.command); setCopied(true); }
                catch { setCopied(false); }
              }} className="rounded-lg p-1 text-zinc-300 hover:text-white">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && <p role="status" className="mt-1 text-[10px] text-emerald-200">Copied</p>}
          </div>
          <p className="text-[11px] leading-5 text-zinc-500">
            A service responding at a port does not prove that a compatible model or workflow is ready.
            Test actual media or a chat reply before relying on it.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-zinc-400">Already running a local engine? Select the preferred provider in Advanced Settings.</p>
        <Link href="/?view=advanced" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-[#f3cbd7] hover:border-[#e8b5c4]/50">
          <Settings2 className="h-3.5 w-3.5" /> Open Advanced Settings
        </Link>
      </div>
    </section>
  );
}
