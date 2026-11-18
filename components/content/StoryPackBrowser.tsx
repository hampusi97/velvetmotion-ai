"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ACCENT_CLASS } from "@/components/content/accents";
import {
  CONTENT_DISCLAIMER,
  EXPANDED_STORY_IDS,
  STORY_PACKS,
  getStoryPack,
} from "@/lib/content";
import type { StoryPack, StoryScene } from "@/lib/content/types";
import { speak, stopSpeaking } from "@/lib/speech";

function chapterTitle(pack: StoryPack, sceneId: string): string {
  return (
    pack.chapters.find((chapter) => chapter.sceneIds.includes(sceneId))?.title ??
    "Scene"
  );
}

export function StoryPackBrowser({ initialPackId = null }: { initialPackId?: string | null }) {
  const [packId, setPackId] = useState<string | null>(initialPackId);
  const [sceneId, setSceneId] = useState<string | null>(() => {
    if (!initialPackId) return null;
    return getStoryPack(initialPackId)?.scenes[0]?.id ?? null;
  });
  const [history, setHistory] = useState<string[]>([]);
  const [tag, setTag] = useState<string>("ALL");
  const [autoVoice, setAutoVoice] = useState(false);

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

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const tags = useMemo(
    () => ["ALL", ...Array.from(new Set(STORY_PACKS.map((pack) => pack.tag)))],
    [],
  );

  const visible = STORY_PACKS.filter((pack) => tag === "ALL" || pack.tag === tag);
  const pack = packId ? getStoryPack(packId) : undefined;
  const scene: StoryScene | undefined =
    pack && sceneId ? pack.scenes.find((item) => item.id === sceneId) : undefined;

  useEffect(() => {
    if (autoVoice && scene) {
      speak(`${scene.title}. ${scene.text}`, { pitch: 1.0, rate: 0.92 });
    }
  }, [autoVoice, scene]);

  const openPack = (id: string) => {
    const next = getStoryPack(id);
    if (!next) return;
    setPackId(id);
    setSceneId(next.scenes[0]?.id ?? null);
    setHistory([]);
  };

  const goTo = (nextSceneId: string) => {
    if (!sceneId) return;
    setHistory((prev) => [...prev, sceneId]);
    setSceneId(nextSceneId);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((prev) => prev.slice(0, -1));
    setSceneId(previous);
  };

  if (!pack || !scene) {
    return (
      <section className="max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-pink-400 mb-1">Story Packs</h2>
        <p className="text-xs text-zinc-500 mb-4">{CONTENT_DISCLAIMER}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((item) => (
            <button
              key={item}
              onClick={() => setTag(item)}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                tag === item
                  ? "bg-pink-600 border-pink-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {visible.map((item) => {
            const expanded = EXPANDED_STORY_IDS.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => openPack(item.id)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left hover:border-pink-500/50 transition active:scale-[0.98]"
              >
                <div className="flex gap-3">
                  <div
                    className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${ACCENT_CLASS[item.accent]}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-pink-600/20 text-pink-300 px-2 py-0.5 rounded-full">
                        {item.tag}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {expanded ? "Expanded" : "New"} · {item.scenes.length} scenes
                      </span>
                    </div>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {item.character.name}, {item.character.age}
                    </div>
                  </div>
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
    <section className="max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={() => {
            stopSpeaking();
            setPackId(null);
            setSceneId(null);
            setHistory([]);
          }}
          className="text-sm text-pink-400"
        >
          ← All story packs
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !autoVoice;
            setAutoVoice(next);
            if (!next) stopSpeaking();
            else speak(`${scene.title}. ${scene.text}`, { pitch: 1.0, rate: 0.92 });
          }}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            autoVoice
              ? "border-pink-500 bg-pink-500/20 text-pink-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          {autoVoice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {autoVoice ? "Auto-Voice On" : "Auto-Voice Off"}
        </button>
      </div>
      <div className="flex gap-3 mb-4">
        <div
          className={`h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br ${ACCENT_CLASS[pack.accent]}`}
          aria-hidden
        />
        <div className="flex-1">
          <div className="text-[10px] font-bold bg-pink-600/20 text-pink-300 px-2 py-0.5 rounded-full inline-block">
            {pack.tag}
          </div>
          <h2 className="text-xl font-bold mt-1">{pack.title}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {pack.character.name}, {pack.character.age} · {pack.character.role}
          </p>
        </div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
          <span>Story Progress</span>
          <span>
            Scene {currentIdx + 1} of {pack.scenes.length} ({progressPct}%)
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{pack.summary}</p>
      <article className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[11px] uppercase tracking-wide text-pink-300/80">
            {chapterTitle(pack, scene.id)}
          </div>
          <button
            type="button"
            onClick={() => speak(`${scene.title}. ${scene.text}`, { pitch: 1.0, rate: 0.92 })}
            className="inline-flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-xs text-pink-200 hover:bg-pink-500/20"
          >
            <Volume2 className="h-3.5 w-3.5" /> Speak Scene
          </button>
        </div>
        <h3 className="font-semibold mb-3">{scene.title}</h3>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-100">
          {scene.text}
        </p>
      </article>
      <div className="mt-4 space-y-2">
        {scene.choices?.map((choice) => (
          <button
            key={choice.id}
            onClick={() => goTo(choice.nextSceneId)}
            className="w-full text-left px-4 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 font-medium"
          >
            {choice.label}
          </button>
        ))}
        {scene.nextSceneId && (
          <button
            onClick={() => scene.nextSceneId && goTo(scene.nextSceneId)}
            className="w-full px-4 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 font-medium"
          >
            Continue
          </button>
        )}
        {atEnd && (
          <button
            onClick={() => openPack(pack.id)}
            className="w-full px-4 py-3 rounded-2xl bg-zinc-800 font-medium"
          >
            Replay this pack
          </button>
        )}
        {history.length > 0 && (
          <button onClick={goBack} className="w-full px-4 py-3 rounded-2xl border border-zinc-700 text-sm text-zinc-300">
            Previous scene
          </button>
        )}
      </div>
    </section>
  );
}
