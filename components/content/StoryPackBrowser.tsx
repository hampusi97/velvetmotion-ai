"use client";

import { useMemo, useState } from "react";
import { ACCENT_CLASS } from "@/components/content/accents";
import {
  CONTENT_DISCLAIMER,
  EXPANDED_STORY_IDS,
  STORY_PACKS,
  getStoryPack,
} from "@/lib/content";
import type { StoryPack, StoryScene } from "@/lib/content/types";

function chapterTitle(pack: StoryPack, sceneId: string): string {
  return (
    pack.chapters.find((chapter) => chapter.sceneIds.includes(sceneId))?.title ??
    "Scene"
  );
}

export function StoryPackBrowser() {
  const [packId, setPackId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [tag, setTag] = useState<string>("ALL");

  const tags = useMemo(
    () => ["ALL", ...Array.from(new Set(STORY_PACKS.map((pack) => pack.tag)))],
    [],
  );

  const visible = STORY_PACKS.filter((pack) => tag === "ALL" || pack.tag === tag);
  const pack = packId ? getStoryPack(packId) : undefined;
  const scene: StoryScene | undefined =
    pack && sceneId ? pack.scenes.find((item) => item.id === sceneId) : undefined;

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

  return (
    <section className="max-w-lg mx-auto">
      <button
        onClick={() => {
          setPackId(null);
          setSceneId(null);
          setHistory([]);
        }}
        className="text-sm text-pink-400 mb-3"
      >
        ← All story packs
      </button>
      <div className="flex gap-3 mb-4">
        <div
          className={`h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br ${ACCENT_CLASS[pack.accent]}`}
          aria-hidden
        />
        <div>
          <div className="text-[10px] font-bold bg-pink-600/20 text-pink-300 px-2 py-0.5 rounded-full inline-block">
            {pack.tag}
          </div>
          <h2 className="text-xl font-bold mt-1">{pack.title}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {pack.character.name}, {pack.character.age} · {pack.character.role}
          </p>
        </div>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{pack.summary}</p>
      <article className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="text-[11px] uppercase tracking-wide text-pink-300/80 mb-1">
          {chapterTitle(pack, scene.id)}
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
