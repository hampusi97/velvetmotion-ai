"use client";

import { useEffect, useState } from "react";
import { JoiBrowser } from "@/components/content/JoiBrowser";
import { StoryPackBrowser } from "@/components/content/StoryPackBrowser";
import { CONTENT_DISCLAIMER } from "@/lib/content";

export default function Home() {
  const [view, setView] = useState("home");
  const [adult, setAdult] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAdult(localStorage.getItem("velvet-age") === "true");
    } catch {
      setAdult(false);
    }
  }, []);

  if (adult === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!adult) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-pink-900/50 bg-zinc-950 p-6">
          <h1 className="text-2xl font-bold text-pink-400 mb-2">VelvetMotion</h1>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            This is an adult fantasy site. Every character is fictional and 18 or older.
            Nothing here is for minors.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem("velvet-age", "true");
              } catch {
                /* private mode can block storage; the gate still lifts for this visit */
              }
              setAdult(true);
            }}
            className="w-full py-3 rounded-2xl bg-pink-600 font-semibold"
          >
            I am 18 or older
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold text-pink-400">VelvetMotion</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">{CONTENT_DISCLAIMER}</p>
      {view === "home" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("girls")} className="p-4 bg-zinc-900 rounded-xl">
            Fictional Girls
          </button>
          <button onClick={() => setView("create")} className="p-4 bg-zinc-900 rounded-xl">
            Create Girl
          </button>
          <button onClick={() => setView("romance")} className="p-4 bg-zinc-900 rounded-xl">
            Romance
          </button>
          <button onClick={() => setView("bnwo")} className="p-4 bg-zinc-900 rounded-xl">
            BNWO
          </button>
          <button onClick={() => setView("tinder")} className="p-4 bg-zinc-900 rounded-xl">
            Tinder
          </button>
          <button onClick={() => setView("joi")} className="p-4 bg-zinc-900 rounded-xl">
            JOI
          </button>
          <button onClick={() => setView("room")} className="p-4 bg-zinc-900 rounded-xl">
            Goon Room
          </button>
          <button onClick={() => setView("suggest")} className="p-4 bg-zinc-900 rounded-xl">
            Suggest
          </button>
          <button onClick={() => setView("gallery")} className="p-4 bg-zinc-900 rounded-xl">
            Gallery
          </button>
          <button onClick={() => setView("packs")} className="p-4 bg-zinc-900 rounded-xl">
            Story Packs
          </button>
        </div>
      )}
      {view === "packs" && (
        <div>
          <button onClick={() => setView("home")} className="mb-4 text-pink-400">
            ← Home
          </button>
          <StoryPackBrowser />
        </div>
      )}
      {view === "joi" && (
        <div>
          <button onClick={() => setView("home")} className="mb-4 text-pink-400">
            ← Home
          </button>
          <JoiBrowser />
        </div>
      )}
      {view !== "home" && view !== "packs" && view !== "joi" && (
        <>
          <button onClick={() => setView("home")} className="mt-4 text-pink-400">
            ← Home
          </button>
          <p className="mt-8 text-zinc-500 text-sm">Full features loading... Pull latest.</p>
        </>
      )}
    </div>
  );
}
