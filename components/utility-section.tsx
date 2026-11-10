"use client";
import { useEffect, useState } from "react";

export function UtilitySection({ view, onHome, onOpenCustom }: { view: string; onHome: () => void; onOpenCustom: (name: string) => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    setText("");
    try { const saved = JSON.parse(localStorage.getItem(`vm-${view}`) || "[]"); setItems(Array.isArray(saved) ? saved.filter(x => typeof x === "string") : []); } catch { setItems([]); }
  }, [view]);
  const add = () => {
    if (!text.trim()) return;
    const next = [...items, text.trim()];
    setItems(next); setText("");
    try { localStorage.setItem(`vm-${view}`, JSON.stringify(next)); } catch { /* session state remains available */ }
  };
  const title = view === "create" ? "Create Girl" : view === "suggest" ? "Suggest a Feature" : view === "gallery" ? "Gallery" : "Room";
  return <section className="mx-auto max-w-xl space-y-4">
    <button onClick={onHome} className="text-pink-400">← Home</button>
    <h1 className="text-2xl font-bold">{title}</h1>
    {view === "room" ? <p>This room is a demo. Live group chat is not connected.</p> : view === "gallery" ? <p>Media generation is a demo. No image provider is connected.</p> : <>
      <p className="text-sm text-zinc-400">Saved on this device.</p>
      <form onSubmit={e => { e.preventDefault(); add(); }} className="flex gap-2">
        <input aria-label={view === "create" ? "Her name" : "Feature idea"} placeholder={view === "create" ? "Her name" : "What do you want?"} value={text} onChange={e => setText(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3" />
        <button disabled={!text.trim()} className="rounded-xl bg-pink-600 px-4 disabled:opacity-40">{view === "create" ? "Create" : "Send"}</button>
      </form>
      <ul className="space-y-2">{items.map((item,i) => <li key={i} className="rounded-xl bg-zinc-900 p-4">{item}{view === "create" && <button onClick={() => onOpenCustom(item)} className="ml-4 text-pink-400">Chat</button>}</li>)}</ul>
    </>}
  </section>;
}
