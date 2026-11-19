"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import {
  ALL_STORY_PACKS,
  CONTENT_DISCLAIMER,
  EXPANDED_STORY_IDS,
  getStoryPack,
} from "@/lib/content";
import type { StoryPack, StoryScene } from "@/lib/content/types";
import { speak, stopSpeaking } from "@/lib/speech";
import { staticPortraitUrl } from "@/lib/portraitFallback";

const STORY_FACES = ["chloe", "elena", "aria", "sienna", "raven", "yuki", "scarlett", "mia", "genevieve", "briony", "calla", "nadine"];

function faceFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return STORY_FACES[Math.abs(h) % STORY_FACES.length];
}

function chapterTitle(pack: StoryPack, sceneId: string): string {
  return pack.chapters.find((c) => c.sceneIds.includes(sceneId))?.title ?? "Scene";
}

export function StoryPackBrowser({ initialPackId = null }: { initialPackId?: string | null }) {
  const [packId, setPackId] = useState<string | null>(initialPackId);
  const [sceneId, setSceneId] = useState<string | null>(() => {
    if (!initialPackId) return null;
    return getStoryPack(initialPackId)?.scenes[0]?.id ?? null;
  });
  const [history, setHistory] = useState<string[]>([]);
  const [tag, setTag] = useState<string>("ALL");
  const [autoVoice, setAutoVoice] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (initialPackId) {
      const next = getStoryPack(initialPackId);
      if (next) {
        setPackId(initialPackId);
        setSceneId(next.scenes[0]?.id ?? null);
        setHistory([]);
      }
    }
  }, [initialPackId]);

  useEffect(() => () => stopSpeaking(), []);

  const tags = useMemo(() => ["ALL", ...Array.from(new Set(ALL_STORY_PACKS.map((p) => p.tag)))], []);
  const visible = ALL_STORY_PACKS.filter((p) => tag === "ALL" || p.tag === tag);
  const pack = packId ? getStoryPack(packId) : undefined;
  const scene: StoryScene | undefined = pack && sceneId ? pack.scenes.find((s) => s.id === sceneId) : undefined;
  const face = pack ? faceFor(pack.id) : "chloe";
  const portrait = staticPortraitUrl(face);

  useEffect(() => {
    if (autoVoice && scene && playing) {
      speak(`${scene.title}. ${scene.text}`, { pitch: 1.02, rate: 0.9 });
    }
  }, [autoVoice, scene, playing]);

  const openPack = (id: string) => {
    const next = getStoryPack(id);
    if (!next) return;
    stopSpeaking();
    setPackId(id);
    setSceneId(next.scenes[0]?.id ?? null);
    setHistory([]);
    setPlaying(true);
  };

  const goTo = (nextSceneId: string) => {
    if (!sceneId) return;
    stopSpeaking();
    setHistory((prev) => [...prev, sceneId]);
    setSceneId(nextSceneId);
    setPlaying(true);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    stopSpeaking();
    setHistory((prev) => prev.slice(0, -1));
    setSceneId(previous);
  };

  if (!pack || !scene) {
    return (
      <section className="max-w-lg mx-auto px-1 pb-24">
        <h2 className="text-2xl font-display text-cream mb-1">Stories</h2>
        <p className="text-xs text-zinc-500 mb-4">{CONTENT_DISCLAIMER}</p>
        <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {tags.map((item) => (
            <button
              key={item}
              onClick={() => setTag(item)}
              className={`shrink-0 text-[12px] px-3 py-1.5 rounded-full border ${tag === item ? "bg-pink-600 border-pink-500 text-white" : "bg-zinc-900/80 border-zinc-800 text-zinc-400"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {visible.map((item) => {
            const f = faceFor(item.id);
            const expanded = EXPANDED_STORY_IDS.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => openPack(item.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 text-left girl-card"
              >
                <img src={staticPortraitUrl(f)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute top-2 left-2">
                  <span className="text-[9px] font-bold bg-pink-600/80 text-white px-1.5 py-0.5 rounded-full">{item.tag}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <div className="font-semibold text-sm text-white leading-tight">{item.title}</div>
                  <div className="text-[10px] text-zinc-300 mt-0.5">{item.character.name} · {item.scenes.length} scenes</div>
                  {expanded && <span className="text-[9px] text-pink-300">Expanded</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const atEnd = !scene.nextSceneId && !(scene.choices && scene.choices.length > 0);
  const currentIdx = Math.max(0, pack.scenes.findIndex((s) => s.id === scene.id));
  const progressPct = Math.round(((currentIdx + 1) / Math.max(1, pack.scenes.length)) * 100);

  return (
    <section className="max-w-lg mx-auto pb-28">
      <div className="relative -mx-4 mb-4 aspect-[3/4] max-h-[70vh] overflow-hidden rounded-b-3xl">
        <img src={portrait} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <button
            onClick={() => { stopSpeaking(); setPackId(null); setSceneId(null); setHistory([]); setPlaying(false); }}
            className="text-sm text-white bg-black/40 backdrop-blur px-3 py-1.5 rounded-full"
          >
            ← Stories
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !autoVoice;
              setAutoVoice(next);
              if (!next) stopSpeaking();
              else { setPlaying(true); speak(`${scene.title}. ${scene.text}`, { pitch: 1.02, rate: 0.9 }); }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur ${
              autoVoice ? "border-pink-400 bg-pink-500/30 text-white" : "border-white/30 bg-black/40 text-zinc-200"
            }`}
          >
            {autoVoice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {autoVoice ? "Voice On" : "Voice Off"}
          </button>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-pink-300">{pack.tag}</div>
          <h2 className="text-2xl font-display text-white leading-tight">{pack.title}</h2>
          <p className="text-xs text-pink-100/80 mt-0.5">{pack.character.name}, {pack.character.age} · {pack.character.role}</p>
          <div className="mt-2 h-1 w-full rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-fuchsia-400" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <article className="px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-pink-300/80">{chapterTitle(pack, scene.id)}</div>
          <button
            type="button"
            onClick={() => { setPlaying(true); speak(`${scene.title}. ${scene.text}`, { pitch: 1.02, rate: 0.9 }); }}
            className="inline-flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-xs text-pink-100"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Speaking" : "Speak"}
          </button>
        </div>
        <h3 className="font-semibold text-lg mb-2 text-cream">{scene.title}</h3>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-100">{scene.text}</p>
      </article>

      <div className="mt-5 space-y-2.5 px-1">
        {scene.choices?.map((choice) => (
          <button
            key={choice.id}
            onClick={() => goTo(choice.nextSceneId)}
            className="w-full text-left px-4 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium text-sm active:scale-[0.98]"
          >
            {choice.label}
          </button>
        ))}
        {scene.nextSceneId && (
          <button
            onClick={() => scene.nextSceneId && goTo(scene.nextSceneId)}
            className="w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium text-sm active:scale-[0.98]"
          >
            Continue
          </button>
        )}
        {atEnd && (
          <button onClick={() => openPack(pack.id)} className="w-full px-4 py-3.5 rounded-2xl bg-zinc-800 font-medium text-sm">
            Replay
          </button>
        )}
        {history.length > 0 && (
          <button onClick={goBack} className="w-full px-4 py-3 rounded-2xl border border-white/15 text-sm text-zinc-300">
            Previous
          </button>
        )}
      </div>
    </section>
  );
}
