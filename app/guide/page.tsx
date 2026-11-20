import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpRight, BookOpen, Cpu, Film, Image as ImageIcon,
  LockKeyhole, MessagesSquare, Mic2, ShieldCheck, Sparkles, Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How it works",
  description: "An accurate guide to VelvetMotion AI companions, chat, voices, media tools, privacy and local model setup.",
};

const FEATURES = [
  {
    title: "Discover fictional companions",
    category: "Ready in browser",
    icon: Sparkles,
    href: "/discover/",
    summary: "Explore the cast, filter by personality, save favorites, and open a character's story.",
    steps: "Choose Explore or Discover, select a fictional adult portrait, then open chat. Curated portraits and cinematic hover effects aren't generated video.",
  },
  {
    title: "Chat and shared scenes",
    category: "AI model required",
    icon: MessagesSquare,
    href: "/chat/",
    summary: "Talk one-on-one, choose story scenarios, or start a two-character conversation.",
    steps: "Select a companion and send a message. The app connects to your configured local or cloud model. Without a responding model, it reports an error instead of fabricating a conversation.",
  },
  {
    title: "Create a companion",
    category: "Creator built in · AI model optional",
    icon: Users,
    href: "/create/",
    summary: "Set a fictional adult's look, voice, backstory and personality.",
    steps: "Choose characteristics and a synthetic voice preset. You can use original fictional artwork you have rights to. Face-consistent new images need a compatible reference model.",
  },
  {
    title: "Generate portraits",
    category: "Image model required",
    icon: ImageIcon,
    href: "/studio/",
    summary: "Compose a prompt, scene, aspect ratio, style and repeatable seed.",
    steps: "Choose Media Studio → Photos. A configured model makes a new image; adult fictional content depends on the provider's own capabilities and rules. Source permissions are essential.",
  },
  {
    title: "Animate images",
    category: "Video model required for real AI motion",
    icon: Film,
    href: "/studio/",
    summary: "Turn suitable original fictional artwork or a permitted nonsexual self-portrait into motion.",
    steps: "Select Video, a source and motion settings. A real video backend generates frames. Without it, a browser-created pan/zoom clip is labeled animated still, not AI video.",
  },
  {
    title: "Design and preview voices",
    category: "Instant device voice · Neural model optional",
    icon: Mic2,
    href: "/create/",
    summary: "Choose among synthetic female-style presets and adjust pace and pitch.",
    steps: "Open Voice Atelier during creation. Instant preview uses device speech; neural preview needs a running Kokoro-compatible model. No real person's voice is cloned.",
  },
  {
    title: "Run on your own computer",
    category: "Desktop installer available",
    icon: Cpu,
    href: "/download/",
    summary: "Download Windows, macOS or Linux; optionally connect Ollama, KoboldCpp and ComfyUI.",
    steps: "Download the official installer and use the Local Setup Wizard. Desktop and browser alone don't supply model weights or unlimited GPU capacity.",
  },
  {
    title: "Save your work privately",
    category: "Local storage · Optional account sync",
    icon: LockKeyhole,
    href: "/collection/",
    summary: "Keep chats, eligible saved art and backups; review sync and provider choices.",
    steps: "Use Collection, Memory Vault and Settings to save, export or remove items. Local browser data can be cleared. Sending media to a cloud provider is separate from local storage.",
  },
];

export default function FeatureGuidePage() {
  return (
    <main className="min-h-screen bg-[#0e0a12] px-4 py-9 text-[#f8eef2] sm:px-6 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#e9b9ca] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> VelvetMotion Home
          </Link>
          <Link href="/download/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200 hover:border-[#e8b6c7]/50">
            <Cpu className="h-4 w-4" /> Desktop & local setup
          </Link>
        </header>

        <section className="relative isolate overflow-hidden rounded-[32px] border border-[#e1aabf]/20 bg-gradient-to-br from-[#372032] via-[#1d1623] to-[#111018] p-6 sm:p-10 lg:p-14">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#d3789d]/15 blur-[85px]" aria-hidden="true" />
          <p className="relative inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#ebc1cb]">
            <BookOpen className="h-4 w-4" /> Private Atelier / The Guide
          </p>
          <h1 className="relative mt-5 max-w-3xl font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Explore every possibility.<span className="block bg-gradient-to-r from-[#f6d0bd] via-[#ecb4cf] to-[#bfb5e9] bg-clip-text text-transparent">Know what is real.</span>
          </h1>
          <p className="relative mt-5 max-w-2xl text-sm leading-7 text-[#ddcbd6]">
            A guide to VelvetMotion&apos;s fictional adult companions, conversations, pictures, video, voices and desktop app.
            Some experiences run immediately. Others need compatible local or cloud AI services. We label the difference.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="flex flex-col rounded-[24px] border border-white/[.09] bg-[#1b1420] p-5 shadow-[0_20px_35px_rgba(0,0,0,.12)] transition hover:border-[#e3a9be]/35 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e0a8be]/20 bg-[#af6182]/15 text-[#f0b9c9]"><Icon className="h-5 w-5" /></span>
                  <span className="max-w-[60%] rounded-full border border-white/10 bg-white/[.035] px-3 py-1 text-right text-[10px] font-semibold text-zinc-300">{feature.category}</span>
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#d9cbd4]">{feature.summary}</p>
                <p className="mt-3 flex-1 text-xs leading-6 text-zinc-400">{feature.steps}</p>
                <Link href={feature.href} className="mt-5 inline-flex items-center gap-1.5 self-start text-xs font-bold text-[#eebacc] hover:text-white">
                  Open feature <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
        <section className="rounded-[25px] border border-[#d1aece]/15 bg-gradient-to-r from-[#251b2a] to-[#17131c] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-[#eac6d1]" />
            <div>
              <h2 className="font-display text-xl font-semibold text-white">Privacy, rights and fiction</h2>
              <p className="mt-2 max-w-4xl text-xs leading-6 text-[#d0c2cc]">
                Adult fantasy features are designed for consenting fictional adults and original owned artwork.
                Real-person portraits, including selfies, are limited to nonsexual animation. Never upload third-party
                intimate images or generate nonconsensual deepfakes. Your local provider, cloud provider and storage
                choices determine where data is processed; an online service must separately meet safety and privacy requirements.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
