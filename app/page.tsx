"use client";

import { useState } from "react";

export default function Home() {
  const [view, setView] = useState("home");
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold text-pink-400 mb-4">VelvetMotion</h1>
      {view === "home" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView("girls")} className="p-4 bg-zinc-900 rounded-xl">Fictional Girls</button>
          <button onClick={() => setView("create")} className="p-4 bg-zinc-900 rounded-xl">Create Girl</button>
          <button onClick={() => setView("romance")} className="p-4 bg-zinc-900 rounded-xl">Romance</button>
          <button onClick={() => setView("bnwo")} className="p-4 bg-zinc-900 rounded-xl">BNWO</button>
          <button onClick={() => setView("tinder")} className="p-4 bg-zinc-900 rounded-xl">Tinder</button>
          <button onClick={() => setView("joi")} className="p-4 bg-zinc-900 rounded-xl">JOI</button>
          <button onClick={() => setView("room")} className="p-4 bg-zinc-900 rounded-xl">Goon Room</button>
          <button onClick={() => setView("suggest")} className="p-4 bg-zinc-900 rounded-xl">Suggest</button>
          <button onClick={() => setView("gallery")} className="p-4 bg-zinc-900 rounded-xl">Gallery</button>
          <button onClick={() => setView("packs")} className="p-4 bg-zinc-900 rounded-xl">Story Packs</button>
        </div>
      )}
      {view !== "home" && <button onClick={() => setView("home")} className="mt-4 text-pink-400">← Home</button>}
      <p className="mt-8 text-zinc-500 text-sm">Full features loading... Pull latest.</p>
    </div>
  );
}
