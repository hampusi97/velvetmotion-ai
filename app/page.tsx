"use client";

import { useState } from "react";

export default function Home() {
  const [view, setView] = useState("home");
  const [ageOk, setAgeOk] = useState(false);

  if (!ageOk) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-pink-400 mb-4">VelvetMotion</h1>
          <p className="text-zinc-400 mb-6">All content is fantasy. Only upload photos of yourself.</p>
          <button onClick={() => setAgeOk(true)} className="px-8 py-4 bg-pink-600 rounded-xl text-lg">I am 18+</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="top-banner text-center text-xs text-pink-400 mb-4">All content is fantasy. Only upload photos of yourself.</div>
      <h1 className="text-2xl font-bold text-pink-400 mb-6">VelvetMotion</h1>

      {view === "home" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("girls")} className="p-5 bg-zinc-900 rounded-xl text-left">Fictional Girls</button>
          <button onClick={() => setView("create")} className="p-5 bg-zinc-900 rounded-xl text-left">Create Girl</button>
          <button onClick={() => setView("romance")} className="p-5 bg-zinc-900 rounded-xl text-left">Romance</button>
          <button onClick={() => setView("bnwo")} className="p-5 bg-zinc-900 rounded-xl text-left">BNWO</button>
          <button onClick={() => setView("tinder")} className="p-5 bg-zinc-900 rounded-xl text-left">Tinder</button>
          <button onClick={() => setView("joi")} className="p-5 bg-zinc-900 rounded-xl text-left">JOI</button>
          <button onClick={() => setView("room")} className="p-5 bg-zinc-900 rounded-xl text-left">Goon Room</button>
          <button onClick={() => setView("suggest")} className="p-5 bg-zinc-900 rounded-xl text-left">Suggest</button>
          <button onClick={() => setView("gallery")} className="p-5 bg-zinc-900 rounded-xl text-left">Gallery</button>
          <button onClick={() => setView("packs")} className="p-5 bg-zinc-900 rounded-xl text-left">Story Packs</button>
        </div>
      )}

      {view !== "home" && (
        <div>
          <button onClick={() => setView("home")} className="text-pink-400 mb-4">← Home</button>
          <div className="p-6 bg-zinc-900 rounded-xl">
            <h2 className="text-xl font-semibold capitalize">{view}</h2>
            <p className="text-zinc-400 mt-2">Section loaded. Full features coming in next update.</p>
          </div>
        </div>
      )}
    </div>
  );
}
